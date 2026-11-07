import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNull, ilike, type SQL } from 'drizzle-orm';
import {
  SALES_ORDER_FILTER_FIELDS,
  type SalesOrderBody,
  type SalesOrderDetail,
  type SalesOrdersList,
  type ListSalesOrdersQuery,
  msg,
} from '@dafne/contracts';

export const DEFAULT_PAGE_SIZE = 20;

const { salesOrder } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** Sales orders that haven't been deleted. */
const notDeleted = isNull(salesOrder.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

/** Only the customer's ID and name, for "customer". */
const customerSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class SalesOrdersService {
  logger = new Logger(SalesOrdersService.name);

  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Lists sales orders that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async listSalesOrders(query: ListSalesOrdersQuery = {}): Promise<SalesOrdersList> {
    const {
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'createdAt',
      sortDirection = 'asc',
    } = query;
    const { db } = this;
    const filters = SALES_ORDER_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) return [];
      // The id matches exactly (an integer column), the other fields contain the text.
      return [
        field === 'id'
          ? eq(salesOrder.id, Number(value))
          : ilike(salesOrder[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [salesOrders, total] = await Promise.all([
      db
        .select({
          id: salesOrder.id,
          customerId: salesOrder.customerId,
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
      with: { createdBy: userSummary, updatedBy: userSummary, customer: customerSummary },
    });

    if (!found) throw new NotFoundException(msg('salesOrders.notFound'));
    return found;
  }

  /** Creates a sales order; `userId` is the creator. */
  async createSalesOrder(body: SalesOrderBody, userId: string): Promise<SalesOrderDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    const [{ id }] = await this.db
      .insert(salesOrder)
      .values({
        notes: body.notes,
        customerId: body.customerId,
        createdAt: now,
        updatedAt: now,
        createdById: userId,
        updatedById: userId,
      })
      .returning({ id: salesOrder.id });
    return this.getSalesOrder(id);
  }

  /**
   * Replaces a sales order's fields; `userId` is the editor. Throws 404
   * if the sales order doesn't exist or is deleted.
   */
  async updateSalesOrder(
    id: number,
    body: SalesOrderBody,
    userId: string,
  ): Promise<SalesOrderDetail> {
    const result = await this.db
      .update(salesOrder)
      .set({
        notes: body.notes,
        customerId: body.customerId,
        updatedById: userId,
        // The time of this change.
        updatedAt: new Date(),
      })
      .where(and(eq(salesOrder.id, id), notDeleted));
    if (result.rowCount === 0)
      throw new NotFoundException(msg('salesOrders.notFound'));
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
    if (result.rowCount === 0)
      throw new NotFoundException(msg('salesOrders.notFound'));
  }
}
