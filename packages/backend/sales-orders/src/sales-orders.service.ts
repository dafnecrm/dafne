import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNull, ilike, type Column, type SQL } from 'drizzle-orm';
import {
  SALES_ORDER_FILTER_FIELDS,
  type SalesOrderFilterField,
  type SalesOrderBody,
  type SalesOrderDetail,
  type SalesOrderDetailItem,
  type SalesOrdersList,
  type ListSalesOrdersQuery,
  type ProductSaleUnit,
  msg,
  multiplyDecimal,
  SalesOrderItemBody,
} from '@dafne/contracts';
import { PostgresErrorCode, rethrowPostgresError } from '@dafne/backend-common';
import { InjectStateMachine, StateMachine } from '@dafne/backend-fsm';
import { ProductsService } from '@dafne/backend-products';
import type { SessionUser } from '@dafne/backend-session';
import type { SalesOrderStatus } from '@dafne/contracts';
import { SALES_ORDER_STATE_MACHINE } from './sales-order.states.js';
import { SALES_ORDERS_RESOURCE } from './sales-order.changelog.js';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
  type Transaction,
} from '@dafne/backend-crud';

export const SALES_ORDERS_DEFAULT_PAGE_SIZE = 20;

const { salesOrder, salesOrderItem, customer, salesOrderType } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<Record<SalesOrderFilterField, (value: string) => number | string>> = {
  id: Number,
  customerId: Number,
  typeId: String,
};

/** Sales orders that haven't been deleted. */
const notDeleted = isNull(salesOrder.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

/** Only the unit's ID and name. */
const uomSummary = { columns: { id: true, name: true } } as const;

/** Only the customer's ID and name, for "customer". */
const customerSummary = { columns: { id: true, name: true } } as const;

/**
 * Turns the Postgres errors a body can cause into client errors (400): a
 * customer, a type or an item's product that doesn't exist.
 */
const rethrowConstraint = rethrowPostgresError([
  {
    code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
    constraint: 'sales_order_type_sales_order_type_id_fkey',
    error: () => new BadRequestException([`typeId: ${msg('salesOrders.typeId.notFound')}`]),
  },
  {
    code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
    constraint: /customer_id/,
    error: () => new BadRequestException([`customerId: ${msg('salesOrders.customerId.notFound')}`]),
  },
  {
    code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
    constraint: /product_id/,
    error: () => new BadRequestException([`items: ${msg('salesOrders.items.productId.notFound')}`]),
  },
  {
    code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
    constraint: /uom_id/,
    error: () => new BadRequestException([`items: ${msg('salesOrders.items.uomId.notFound')}`]),
  },
]);

/** An item as saved, with its price: one that comes back unchanged keeps it. */
interface PricedItem {
  position: number;
  productId: number;
  uomId: string;
  quantity: number;
  price: number;
}

/** Quantities are numeric(18,6): the base one is rounded to that scale. */
const roundQuantity = (value: number) => Math.round(value * 1e6) / 1e6;

@Injectable()
export class SalesOrdersService
  implements
    CrudService<
      number,
      ListSalesOrdersQuery,
      SalesOrdersList,
      SalesOrderBody,
      SalesOrderDetail
    >
{
  logger = new Logger(SalesOrdersService.name);

  /** Runs the writes with the hooks registered on `sales-orders`. */
  private readonly hooks: CrudHooks<number, SalesOrderBody, SalesOrderDetail>;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    @InjectStateMachine(SALES_ORDER_STATE_MACHINE)
    private readonly stateMachine: StateMachine<SalesOrderStatus, number>,
    registry: CrudHooksRegistry,
    private readonly products: ProductsService,
  ) {
    this.hooks = registry.for(SALES_ORDERS_RESOURCE, { db, load: (id, tx) => this.get(id, tx) });
  }

  /**
   * Lists sales orders that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(query: ListSalesOrdersQuery = {}): Promise<SalesOrdersList> {
    const { limit = SALES_ORDERS_DEFAULT_PAGE_SIZE, offset = 0, sortBy = 'id', sortDirection = 'desc' } = query;
    const { db } = this;
    const filters = SALES_ORDER_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
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
          status: salesOrder.status,
          customerId: salesOrder.customerId,
          typeId: salesOrder.typeId,
          createdAt: salesOrder.createdAt,
          updatedAt: salesOrder.updatedAt,
          customer: {
            id: customer.id,
            name: customer.name,
          },
          type: {
            id: salesOrderType.id,
            description: salesOrderType.description,
          }
        })
        .from(salesOrder)
        .innerJoin(customer, eq(customer.id, salesOrder.customerId))
        .innerJoin(salesOrderType, eq(salesOrderType.id, salesOrder.typeId))
        .where(where)
        .orderBy(direction(salesOrder[sortBy]), asc(salesOrder.id))
        .limit(limit)
        .offset(offset),
      db.$count(salesOrder, where),
    ]);

    return { items: salesOrders, total, limit, offset };
  }

  /**
   * One sales order that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async get(id: number, db: Executor = this.db): Promise<SalesOrderDetail> {
    const found = await db.query.salesOrder.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        createdBy: userSummary,
        updatedBy: userSummary,
        customer: customerSummary,
        type: { columns: { id: true, description: true } },
        items: {
          columns: { orderId: false },
          with: {
            product: { columns: { id: true, name: true, price: true }, with: { uom: uomSummary } },
            uom: uomSummary,
          },
        },
      },
    });

    if (!found) {
      throw new NotFoundException(msg('salesOrders.notFound'));
    }

    return found;
  }

  /**
   * The item at `position` of a sales order that isn't deleted, with all
   * its columns and its product. Throws 404 otherwise.
   */
  async getSalesOrderItem(orderId: number, position: number): Promise<SalesOrderDetailItem> {
    const found = await this.db.query.salesOrderItem.findFirst({
      where: { orderId, position, salesOrder: { deletedAt: { isNull: true } } },
      columns: { orderId: false },
      with: {
        product: { columns: { id: true, name: true, price: true }, with: { uom: uomSummary } },
        uom: uomSummary,
      },
    });
    if (!found) {
      throw new NotFoundException(msg('salesOrders.items.notFound'));
    }
    return found;
  }

  /** Creates a sales order; `actor` is the creator. */
  async create(body: SalesOrderBody, actor: Actor): Promise<SalesOrderDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();

    this.logger.log("CREATING", JSON.stringify(body))
    return this.hooks
      .create({ body, actor }, async ({ tx, body }) => {
        // Born in draft: another status goes through the state machine.
        const [{ id }] = await tx
          .insert(salesOrder)
          .values({
            notes: body.notes,
            customerId: body.customerId,
            typeId: body.typeId,
            createdAt: now,
            updatedAt: now,
            createdById: actor.id,
            updatedById: actor.id,
          })
          .returning({ id: salesOrder.id });

        await this.insertSalesOrderItems(tx, id, body.items);

        // After the items, as in update: the guards see the order as saved.
        if (body.status) {
          await this.stateMachine.transition(id, body.status, { tx, user: actor });
        }
        return id;
      })
      .catch(rethrowConstraint);
  }

  /**
   * Replaces a sales order's fields; `actor` is the editor. Unchanged items
   * keep their price, unless `reprice`: then every item is priced anew from
   * its product's price. Throws 404 if the sales order doesn't exist or is
   * deleted.
   */
  async update(
    id: number,
    body: SalesOrderBody,
    actor: Actor,
    { reprice = false }: { reprice?: boolean } = {},
  ): Promise<SalesOrderDetail> {
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      const result = await tx
        .update(salesOrder)
        .set({
          notes: body.notes,
          customerId: body.customerId,
          typeId: body.typeId,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(salesOrder.id, id), notDeleted));

      if (result.rowCount === 0) {
        throw new NotFoundException(msg('salesOrders.notFound'));
      }

      // The items are written again: unchanged ones keep their price, but
      // when repricing (no previous items, so none is kept).
      const previous = reprice
        ? []
        : await tx
            .select({
              position: salesOrderItem.position,
              productId: salesOrderItem.productId,
              uomId: salesOrderItem.uomId,
              quantity: salesOrderItem.quantity,
              price: salesOrderItem.price,
            })
            .from(salesOrderItem)
            .where(eq(salesOrderItem.orderId, id));
      await tx.delete(salesOrderItem).where(eq(salesOrderItem.orderId, id));
      await this.insertSalesOrderItems(tx, id, body.items, previous);
      
      // After the items: the guards see the order as saved.
      if (body.status) {
        await this.stateMachine.transition(id, body.status, { tx, user: actor });
      }
    }).catch(rethrowConstraint);
  }

  /**
   * Deletes a sales order logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(salesOrder)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(salesOrder.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('salesOrders.notFound'));
      }
    });
  }

  /**
   * Moves a sales order to `status` through its state machine; `user` is
   * the editor. Throws 404 if it doesn't exist or is deleted, 400 if the
   * status can't follow the current one, 403 if a guard says no.
   */
  async changeSalesOrderStatus(id: number, status: SalesOrderStatus, user: SessionUser): Promise<SalesOrderDetail> {
    await this.stateMachine.transition(id, status, { user });
    return this.get(id);
  }

  /**
   * Inserts the items of an order. Each quantity is in the item's unit (the
   * product's base unit when left out), which must be one the product is
   * sold in: its base quantity and price (the product's price × the base
   * quantity) are computed from it. An item of `previous` with the same
   * position, product, unit and quantity keeps its price, so saving an
   * order again doesn't reprice it. 400 when the product doesn't exist or can't be sold in that
   * unit.
   */
  async insertSalesOrderItems(
    tx: Transaction,
    salesOrderId: number,
    items: SalesOrderItemBody[],
    previous: PricedItem[] = [],
  ) {
    if (!items.length) {
      return;
    }
    // Each product's units, read once however many items have it.
    const units = new Map<number, Promise<ProductSaleUnit[] | null>>();
    const unitsOf = (productId: number) => {
      let found = units.get(productId);
      if (!found) {
        found = this.products.units(productId, tx).catch((error: unknown) => {
          if (error instanceof NotFoundException) {
            return null;
          }
          throw error;
        });
        units.set(productId, found);
      }
      return found;
    };

    const rows = [];
    for (const [index, item] of items.entries()) {
      const productUnits = await unitsOf(item.productId);
      if (!productUnits) {
        throw new BadRequestException([`items.${index}.productId: ${msg('salesOrders.items.productId.notFound')}`]);
      }
      // The base unit comes first.
      const unit = item.uomId ? productUnits.find((candidate) => candidate.uomId === item.uomId) : productUnits[0];
      if (!unit) {
        throw new BadRequestException([`items.${index}.uomId: ${msg('salesOrders.items.uomId.notConvertible')}`]);
      }
      const baseQuantity = roundQuantity(item.quantity * unit.factor);
      const kept = previous.find(
        (old) =>
          old.position === item.position &&
          old.productId === item.productId &&
          old.uomId === unit.uomId &&
          old.quantity === item.quantity,
      );
      rows.push({
        orderId: salesOrderId,
        productId: item.productId,
        quantity: item.quantity,
        uomId: unit.uomId,
        baseQuantity,
        // The base unit (its price, the product's) comes first.
        price: kept?.price ?? multiplyDecimal(productUnits[0].price, baseQuantity, 2),
        position: item.position,
      });
    }
    await tx.insert(schema.salesOrderItem).values(rows);
  }
}
