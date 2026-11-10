import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNull, ilike, type Column, type SQL } from 'drizzle-orm';
import {
  SALES_ORDER_FILTER_FIELDS,
  type SalesOrderFilterField,
  type SalesOrderBody,
  type SalesOrderDetail,
  type SalesOrderDetailItem,
  type SalesOrdersList,
  type ListSalesOrdersQuery,
  msg,
  SalesOrderItemBody,
} from '@dafne/contracts';
import { PostgresErrorCode } from '@dafne/backend-common';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const DEFAULT_PAGE_SIZE = 20;

const { salesOrder, salesOrderItem } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<Record<SalesOrderFilterField, (value: string) => number | string>> = {
  id: Number,
  customerId: Number,
  type: String,
};

/** Sales orders that haven't been deleted. */
const notDeleted = isNull(salesOrder.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

/** Only the customer's ID and name, for "customer". */
const customerSummary = { columns: { id: true, name: true } } as const;

const salesOrderItemSummary = {
  columns: { quantity: true, position: true },
  with: {
    product: {
      columns: { id: true, name: true },
    },
  },
} as const;

/**
 * Turns the Postgres errors a body can cause (drizzle wraps them as the
 * cause) into client errors: a taken email (409), an address country that
 * isn't in the countries table (400). Rethrows anything else.
 */
function rethrowConstraint(error: unknown): never {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  const { code, constraint } = cause instanceof Error ? (cause as { code?: unknown; constraint?: unknown }) : {};
  const name = typeof constraint === 'string' ? constraint : '';
  if (code === PostgresErrorCode.FOREIGN_KEY_VIOLATION) {
    if (name.includes('customer_id')) {
      throw new BadRequestException([`addresses: ${msg('salesOrders.customerId.notFound')}`]);
    } else if (name.includes('product_id')) {
      throw new BadRequestException([`items: ${msg('salesOrders.items.productId.notFound')}`]);
    }
  }
  throw error;
}

@Injectable()
export class SalesOrdersService {
  logger = new Logger(SalesOrdersService.name);

  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Lists sales orders that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async listSalesOrders(query: ListSalesOrdersQuery = {}): Promise<SalesOrdersList> {
    const { limit = DEFAULT_PAGE_SIZE, offset = 0, sortBy = 'createdAt', sortDirection = 'asc' } = query;
    const { db } = this;
    const filters = SALES_ORDER_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) return [];
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [exact ? eq(salesOrder[field] as Column, exact(value)) : ilike(salesOrder[field], `%${escapeLike(value)}%`)];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [salesOrders, total] = await Promise.all([
      db
        .select({
          id: salesOrder.id,
          customerId: salesOrder.customerId,
          type: salesOrder.type,
          createdAt: salesOrder.createdAt,
          updatedAt: salesOrder.updatedAt,
        })
        .from(salesOrder)
        .where(where)
        .orderBy(direction(salesOrder[sortBy]), asc(salesOrder.id))
        .limit(limit)
        .offset(offset),
      db.$count(salesOrder, where),
    ]);

    return { salesOrders, total, limit, offset };
  }

  /**
   * One sales order that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async getSalesOrder(id: number): Promise<SalesOrderDetail> {
    const found = await this.db.query.salesOrder.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        createdBy: userSummary,
        updatedBy: userSummary,
        customer: customerSummary,
        items: {
          columns: { quantity: true, position: true, productId: true },
          with: {
            product: {
              columns: { id: true, name: true },
            },
          },
        } as const,
      },
    });

    if (!found) throw new NotFoundException(msg('salesOrders.notFound'));

    return {
      ...found,
      items: found.items?.map((item) => ({ ...item, product: item.product[0] })) ?? [],
    };
  }

  /**
   * The item at `position` of a sales order that isn't deleted, with all
   * its columns and its product. Throws 404 otherwise.
   */
  async getSalesOrderItem(orderId: number, position: number): Promise<SalesOrderDetailItem> {
    const found = await this.db.query.salesOrderItem.findFirst({
      where: { orderId, position, salesOrder: { deletedAt: { isNull: true } } },
      columns: { orderId: false },
      with: { product: { columns: { id: true, name: true } } },
    });
    const product = found?.product[0];
    if (!found || !product) throw new NotFoundException(msg('salesOrders.items.notFound'));
    return { ...found, product };
  }

  /** Creates a sales order; `userId` is the creator. */
  async createSalesOrder(body: SalesOrderBody, userId: string): Promise<SalesOrderDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();

    this.logger.log("CREATING", JSON.stringify(body))
    const id = await this.db
      .transaction(async (tx) => {
        const [{ id }] = await this.db
          .insert(salesOrder)
          .values({
            notes: body.notes,
            customerId: body.customerId,
            type: body.type,
            createdAt: now,
            updatedAt: now,
            createdById: userId,
            updatedById: userId,
          })
          .returning({ id: salesOrder.id });

        return id;
      })
      .catch(rethrowConstraint);

    this.logger.log("ID", id)
    return this.getSalesOrder(id);
  }

  /**
   * Replaces a sales order's fields; `userId` is the editor. Throws 404
   * if the sales order doesn't exist or is deleted.
   */
  async updateSalesOrder(id: number, body: SalesOrderBody, userId: string): Promise<SalesOrderDetail> {
    await this.db.transaction(async (tx) => {
      const result = await tx
        .update(salesOrder)
        .set({
          notes: body.notes,
          customerId: body.customerId,
          type: body.type,
          updatedById: userId,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(salesOrder.id, id), notDeleted));

      if (result.rowCount === 0) throw new NotFoundException(msg('salesOrders.notFound'));

      await tx.delete(salesOrderItem).where(eq(salesOrderItem.orderId, id));
      await this.insertSalesOrderItems(tx, id, body.items);
    });

    return this.getSalesOrder(id);
  }

  /**
   * Deletes a sales order logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async deleteSalesOrder(id: number, userId: string) {
    const now = new Date();
    const result = await this.db
      .update(salesOrder)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(and(eq(salesOrder.id, id), notDeleted));
    if (result.rowCount === 0) throw new NotFoundException(msg('salesOrders.notFound'));
  }

  async insertSalesOrderItems(tx: Transaction, salesOrderId: number, items: SalesOrderItemBody[]) {
    if (!items.length) return;
    await tx.insert(schema.salesOrderItem).values(
      items.map((item) => ({
        orderId: salesOrderId,
        productId: item.productId,
        quantity: item.quantity,
        position: item.position,
      })),
    );
  }
}
