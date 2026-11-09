import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNull, ilike, type SQL } from 'drizzle-orm';
import {
  SALES_ORDER_TYPE_FILTER_FIELDS,
  type SalesOrderTypeBody,
  type SalesOrderTypeDetail,
  type SalesOrderTypesList,
  type ListSalesOrderTypesQuery,
  msg,
} from '@dafne/contracts';

export const DEFAULT_PAGE_SIZE = 20;

const { salesOrderType } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** Sales order types that haven't been deleted. */
const notDeleted = isNull(salesOrderType.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class SalesOrderTypesService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Lists sales order types that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async listSalesOrderTypes(
    query: ListSalesOrderTypesQuery = {},
  ): Promise<SalesOrderTypesList> {
    const {
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'createdAt',
      sortDirection = 'asc',
    } = query;
    const { db } = this;
    const filters = SALES_ORDER_TYPE_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) return [];
      // The id matches exactly, the other fields contain the text.
      return [
        field === 'id'
          ? eq(salesOrderType.id, value)
          : ilike(salesOrderType[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [salesOrderTypes, total] = await Promise.all([
      db
        .select({
          id: salesOrderType.id,
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

    return { salesOrderTypes, total, limit, offset };
  }

  /**
   * One sales order type that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async getSalesOrderType(id: string): Promise<SalesOrderTypeDetail> {
    const found = await this.db.query.salesOrderType.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { description: false, createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) throw new NotFoundException(msg('salesOrderTypes.notFound'));
    return found;
  }

  /** Creates a sales order type; `userId` is the creator. */
  async createSalesOrderType(
    body: SalesOrderTypeBody,
    userId: string,
  ): Promise<SalesOrderTypeDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    // The id is random: Drizzle picks it ($defaultFn).
    const [{ id }] = await this.db
      .insert(salesOrderType)
      .values({
        createdAt: now,
        updatedAt: now,
        createdById: userId,
        updatedById: userId,
      })
      .returning({ id: salesOrderType.id });
    return this.getSalesOrderType(id);
  }

  /**
   * Replaces a sales order type's fields; `userId` is the editor. Throws 404
   * if the sales order type doesn't exist or is deleted.
   */
  async updateSalesOrderType(
    id: string,
    body: SalesOrderTypeBody,
    userId: string,
  ): Promise<SalesOrderTypeDetail> {
    const result = await this.db
      .update(salesOrderType)
      .set({
        updatedById: userId,
        // The time of this change.
        updatedAt: new Date(),
      })
      .where(and(eq(salesOrderType.id, id), notDeleted));
    if (result.rowCount === 0)
      throw new NotFoundException(msg('salesOrderTypes.notFound'));
    return this.getSalesOrderType(id);
  }

  /**
   * Deletes a sales order type logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async deleteSalesOrderType(id: string, userId: string) {
    const now = new Date();
    const result = await this.db
      .update(salesOrderType)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(and(eq(salesOrderType.id, id), notDeleted));
    if (result.rowCount === 0)
      throw new NotFoundException(msg('salesOrderTypes.notFound'));
  }
}
