import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNull, ilike, type Column, type SQL } from 'drizzle-orm';
import {
  QUOTATION_FILTER_FIELDS,
  type QuotationFilterField,
  type QuotationBody,
  type QuotationDetail,
  type QuotationDetailItem,
  type QuotationStatus,
  type QuotationsList,
  type ListQuotationsQuery,
  type SalesOrderItemBody,
  msg,
} from '@dafne/contracts';
import { PostgresErrorCode, rethrowPostgresError } from '@dafne/backend-common';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
  type Transaction,
} from '@dafne/backend-crud';
import { InjectStateMachine, StateMachine } from '@dafne/backend-fsm';
import { ProductsService } from '@dafne/backend-products';
import type { SessionUser } from '@dafne/backend-session';
import { priceItems, type PricedItem } from '../items/price-items.js';
import { QUOTATIONS_RESOURCE } from './quotation.changelog.js';
import { QUOTATION_STATE_MACHINE } from './quotation.transition.js';

export const QUOTATIONS_DEFAULT_PAGE_SIZE = 20;

const { quotation, quotationItem, customer, salesOrderType } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<Record<QuotationFilterField, (value: string) => number | string>> = {
  id: Number,
  customerId: Number,
  typeId: String,
};

/** Quotations that haven't been deleted. */
const notDeleted = isNull(quotation.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

/** Only the unit's ID and name. */
const uomSummary = { columns: { id: true, name: true } } as const;

/** An item's product: its name, base unit and price of today. */
const itemWith = {
  product: { columns: { id: true, name: true, price: true }, with: { uom: uomSummary } },
  uom: uomSummary,
} as const;

/**
 * Turns the Postgres errors a body can cause into client errors (400): a
 * customer, a type or an item's product that doesn't exist.
 */
const rethrowConstraint = rethrowPostgresError([
  {
    code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
    constraint: /type_id/,
    error: () => new BadRequestException([`typeId: ${msg('quotations.typeId.notFound')}`]),
  },
  {
    code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
    constraint: /customer_id/,
    error: () => new BadRequestException([`customerId: ${msg('quotations.customerId.notFound')}`]),
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

/**
 * Quotations: the items of a sales order (priced by `priceItems`), their own
 * statuses. Accepting one creates its sales order (CreateSalesOrderFromQuotation).
 */
@Injectable()
export class QuotationsService
  implements CrudService<number, ListQuotationsQuery, QuotationsList, QuotationBody, QuotationDetail>
{
  /** Runs the writes with the hooks registered on `quotations`. */
  private readonly hooks: CrudHooks<number, QuotationBody, QuotationDetail>;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    @InjectStateMachine(QUOTATION_STATE_MACHINE)
    private readonly stateMachine: StateMachine<QuotationStatus, number>,
    registry: CrudHooksRegistry,
    private readonly products: ProductsService,
  ) {
    this.hooks = registry.for(QUOTATIONS_RESOURCE, { db, load: (id, tx) => this.get(id, tx) });
  }

  /**
   * Lists quotations that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(query: ListQuotationsQuery = {}): Promise<QuotationsList> {
    const { limit = QUOTATIONS_DEFAULT_PAGE_SIZE, offset = 0, sortBy = 'id', sortDirection = 'desc' } = query;
    const { db } = this;
    const filters = QUOTATION_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [exact ? eq(quotation[field] as Column, exact(value)) : ilike(quotation[field], `%${escapeLike(value)}%`)];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [quotations, total] = await Promise.all([
      db
        .select({
          id: quotation.id,
          status: quotation.status,
          customerId: quotation.customerId,
          typeId: quotation.typeId,
          validUntil: quotation.validUntil,
          createdAt: quotation.createdAt,
          updatedAt: quotation.updatedAt,
          customer: { id: customer.id, name: customer.name },
          type: { id: salesOrderType.id, description: salesOrderType.description },
          itemsCount: db.$count(quotationItem, eq(quotationItem.quotationId, quotation.id))
        })
        .from(quotation)
        .innerJoin(customer, eq(customer.id, quotation.customerId))
        .innerJoin(salesOrderType, eq(salesOrderType.id, quotation.typeId))
        .where(where)
        .orderBy(direction(quotation[sortBy]), asc(quotation.id))
        .limit(limit)
        .offset(offset),
      db.$count(quotation, where),
    ]);

    return { items: quotations, total, limit, offset };
  }

  /**
   * One quotation that isn't deleted, with its items, who created and last
   * updated it, and its sales order once accepted. Throws 404 otherwise.
   */
  async get(id: number, db: Executor = this.db): Promise<QuotationDetail> {
    const found = await db.query.quotation.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        createdBy: userSummary,
        updatedBy: userSummary,
        customer: { columns: { id: true, name: true } },
        type: { columns: { id: true, description: true } },
        items: { columns: { quotationId: false }, with: itemWith, orderBy: { position: 'asc' } },
        salesOrder: { columns: { id: true, status: true }, where: { deletedAt: { isNull: true } } },
      },
    });

    if (!found) {
      throw new NotFoundException(msg('quotations.notFound'));
    }

    return { ...found, salesOrder: found.salesOrder ?? null };
  }

  /**
   * The item at `position` of a quotation that isn't deleted, with all its
   * columns and its product. Throws 404 otherwise.
   */
  async getQuotationItem(quotationId: number, position: number): Promise<QuotationDetailItem> {
    const found = await this.db.query.quotationItem.findFirst({
      where: { quotationId, position, quotation: { deletedAt: { isNull: true } } },
      columns: { quotationId: false },
      with: itemWith,
    });
    if (!found) {
      throw new NotFoundException(msg('quotations.items.notFound'));
    }
    return found;
  }

  /** Creates a quotation; `actor` is the creator. */
  async create(body: QuotationBody, actor: Actor): Promise<QuotationDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    return this.hooks
      .create({ body, actor }, async ({ tx, body }) => {
        // Born in draft: another status goes through the state machine.
        const [{ id }] = await tx
          .insert(quotation)
          .values({
            notes: body.notes,
            customerId: body.customerId,
            typeId: body.typeId,
            validUntil: body.validUntil,
            createdAt: now,
            updatedAt: now,
            createdById: actor.id,
            updatedById: actor.id,
          })
          .returning({ id: quotation.id });

        await this.insertQuotationItems(tx, id, body.items);

        // After the items: the guards see the quotation as saved.
        if (body.status && body.status !== 'draft') {
          await this.stateMachine.transition(id, body.status, { tx, user: actor });
        }
        return id;
      })
      .catch(rethrowConstraint);
  }

  /**
   * Replaces a quotation's fields; `actor` is the editor. Unchanged items
   * keep their price, unless `reprice`: then every item is priced anew from
   * its product's price. Throws 404 if the quotation doesn't exist or is
   * deleted.
   */
  async update(
    id: number,
    body: QuotationBody,
    actor: Actor,
    { reprice = false }: { reprice?: boolean } = {},
  ): Promise<QuotationDetail> {
    return this.hooks
      .update({ id, body, actor }, async ({ tx, body }) => {
        const result = await tx
          .update(quotation)
          .set({
            notes: body.notes,
            customerId: body.customerId,
            typeId: body.typeId,
            validUntil: body.validUntil,
            updatedById: actor.id,
            // The time of this change.
            updatedAt: new Date(),
          })
          .where(and(eq(quotation.id, id), notDeleted));

        if (result.rowCount === 0) {
          throw new NotFoundException(msg('quotations.notFound'));
        }

        // The items are written again: unchanged ones keep their price, but
        // when repricing (no previous items, so none is kept).
        const previous = reprice
          ? []
          : await tx
              .select({
                position: quotationItem.position,
                productId: quotationItem.productId,
                uomId: quotationItem.uomId,
                quantity: quotationItem.quantity,
                price: quotationItem.price,
              })
              .from(quotationItem)
              .where(eq(quotationItem.quotationId, id));
        await tx.delete(quotationItem).where(eq(quotationItem.quotationId, id));
        await this.insertQuotationItems(tx, id, body.items, previous);

        // After the items: the guards see the quotation as saved.
        if (body.status) {
          await this.stateMachine.transition(id, body.status, { tx, user: actor });
        }
      })
      .catch(rethrowConstraint);
  }

  /**
   * Deletes a quotation logically: sets deletedAt, so it disappears from
   * the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(quotation)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(quotation.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('quotations.notFound'));
      }
    });
  }

  /**
   * Moves a quotation to `status` through its state machine; `user` is the
   * editor. `accepted` also creates its sales order. Throws 404 if it
   * doesn't exist or is deleted, 400 if the status can't follow the current
   * one, 403 if a guard says no.
   */
  async changeQuotationStatus(id: number, status: QuotationStatus, user: SessionUser): Promise<QuotationDetail> {
    await this.stateMachine.transition(id, status, { user });
    return this.get(id);
  }

  /** Inserts the items of a quotation, priced as a sales order's (`priceItems`). */
  async insertQuotationItems(
    tx: Transaction,
    quotationId: number,
    items: SalesOrderItemBody[],
    previous: PricedItem[] = [],
  ) {
    if (!items.length) {
      return;
    }
    const rows = await priceItems(this.products, tx, items, previous);
    await tx.insert(quotationItem).values(rows.map((row) => ({ ...row, quotationId })));
  }
}
