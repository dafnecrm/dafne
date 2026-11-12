import {
  PostgresErrorCode,
  rethrowPostgresError,
} from '@dafne/backend-common';
import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  isNull,
  ilike,
  or,
  type Column,
  type SQL
} from 'drizzle-orm';
import {
  SALES_ORDER_TYPE_FILTER_FIELDS,
  type SalesOrderTypeFilterField,
  type SalesOrderTypeBody,
  type SalesOrderTypeDetail,
  type SalesOrderTypesList,
  type ListSalesOrderTypesQuery,
  msg,
} from '@dafne/contracts';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
} from '@dafne/backend-crud';

export const SALES_ORDER_TYPES_DEFAULT_PAGE_SIZE = 20;

const { salesOrderType } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<
  Record<SalesOrderTypeFilterField, (value: string) => boolean | number | string>
> = {
  id: String,
  // "true" | "false" (the contract checks it): ILIKE doesn't work on a boolean.
  active: (value) => value === 'true',
};

/** Sales order types that haven't been deleted. */
const notDeleted = isNull(salesOrderType.deletedAt);

/** A taken id (the client picks it) becomes a 409. */
const rethrowTakenId = rethrowPostgresError([
  {
    code: PostgresErrorCode.UNIQUE_VIOLATION,
    constraint: 'sales_order_type_pkey',
    error: () => new ConflictException(msg('salesOrderTypes.id.taken')),
  },
]);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class SalesOrderTypesService
  implements
    CrudService<
      string,
      ListSalesOrderTypesQuery,
      SalesOrderTypesList,
      SalesOrderTypeBody,
      SalesOrderTypeDetail
    >
{
  /** Runs the writes with the hooks registered on `sales-order-types`. */
  private readonly hooks: CrudHooks<string, SalesOrderTypeBody, SalesOrderTypeDetail>;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
  ) {
    this.hooks = registry.for('sales-order-types', { db, load: (id, tx) => this.get(id, tx) });
  }

  /**
   * Lists sales order types that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains) and by
   * `search` (text the id or the description contains).
   */
  async list(
    query: ListSalesOrderTypesQuery = {},
  ): Promise<SalesOrderTypesList> {
    const {
      limit = SALES_ORDER_TYPES_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'asc',
    } = query;
    const { db } = this;
    const filters = SALES_ORDER_TYPE_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [
        exact
          ? eq(salesOrderType[field] as Column, exact(value))
          : ilike(salesOrderType[field], `%${escapeLike(value)}%`),
      ];
    });
    const search = query.search?.trim();
    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      filters.push(
        or(
          ilike(salesOrderType.id, pattern),
          ilike(salesOrderType.description, pattern),
        ) as SQL,
      );
    }
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [salesOrderTypes, total] = await Promise.all([
      db
        .select({
          id: salesOrderType.id,
          description: salesOrderType.description,
          active: salesOrderType.active,
          createdAt: salesOrderType.createdAt,
          updatedAt: salesOrderType.updatedAt,
        })
        .from(salesOrderType)
        .where(where)
        .orderBy(direction(salesOrderType[sortBy]), asc(salesOrderType.id))
        .limit(limit)
        .offset(offset),
      db.$count(salesOrderType, where),
    ]);

    return { items: salesOrderTypes, total, limit, offset };
  }

  /**
   * One sales order type that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async get(id: string, db: Executor = this.db): Promise<SalesOrderTypeDetail> {
    const found = await db.query.salesOrderType.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) {
      throw new NotFoundException(msg('salesOrderTypes.notFound'));
    }
    return found;
  }

  /** Creates a sales order type; `actor` is the creator. */
  async create(
    body: SalesOrderTypeBody,
    actor: Actor,
  ): Promise<SalesOrderTypeDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    // The id is the body's: the client picks it (409 when taken).
    return this.hooks.create({ body, actor }, async ({ tx, body }) => {
      const [{ id }] = await tx
        .insert(salesOrderType)
        .values({
          id: body.id,
          description: body.description,
          active: body.active,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: salesOrderType.id })
        .catch(rethrowTakenId);
      return id;
    });
  }

  /**
   * Replaces a sales order type's fields; `actor` is the editor. Throws 404
   * if the sales order type doesn't exist or is deleted.
   */
  async update(
    id: string,
    body: SalesOrderTypeBody,
    actor: Actor,
  ): Promise<SalesOrderTypeDetail> {
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      const result = await tx
        .update(salesOrderType)
        .set({
          description: body.description,
          active: body.active,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(salesOrderType.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('salesOrderTypes.notFound'));
      }
    });
  }

  /**
   * Deletes a sales order type logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: string, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(salesOrderType)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(salesOrderType.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('salesOrderTypes.notFound'));
      }
    });
  }
}
