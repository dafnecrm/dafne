import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { PostgresErrorCode, rethrowPostgresError } from '@dafne/backend-common';
import {
  BadRequestException,
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
  ne,
  or,
  type Column,
  type SQL,
} from 'drizzle-orm';
import {
  UOM_FILTER_FIELDS,
  type UomFilterField,
  type UomBody,
  type UomDetail,
  type UomKind,
  type UomsList,
  type ListUomsQuery,
  msg,
} from '@dafne/contracts';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
  type Transaction,
} from '@dafne/backend-crud';

export const UOMS_DEFAULT_PAGE_SIZE = 20;

const { uom, uomConversion } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<
  Record<UomFilterField, (value: string) => number | string>
> = {
  id: String,
};

/** Uoms that haven't been deleted. */
const notDeleted = isNull(uom.deletedAt);

/** A taken id (the client picks it) becomes a 409. */
const rethrowTakenId = rethrowPostgresError([
  {
    code: PostgresErrorCode.UNIQUE_VIOLATION,
    constraint: 'uom_pkey',
    error: () => new ConflictException(msg('uoms.id.taken')),
  },
]);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

/** A unit as conversions show it. */
const uomSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class UomsService implements CrudService<
  string,
  ListUomsQuery,
  UomsList,
  UomBody,
  UomDetail
> {
  /** Runs the writes with the hooks registered on `uoms`. */
  private readonly hooks: CrudHooks<string, UomBody, UomDetail>;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
  ) {
    this.hooks = registry.for('uoms', {
      db,
      load: (id, tx) => this.get(id, tx),
    });
  }

  /**
   * Lists uoms that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(query: ListUomsQuery = {}): Promise<UomsList> {
    const {
      limit = UOMS_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'asc',
    } = query;
    const { db } = this;
    const filters = UOM_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [
        exact
          ? eq(uom[field] as Column, exact(value))
          : ilike(uom[field], `%${escapeLike(value)}%`),
      ];
    });
    const search = query.search?.trim();
    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      filters.push(or(ilike(uom.id, pattern), ilike(uom.name, pattern)) as SQL);
    }
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [uoms, total] = await Promise.all([
      db
        .select({
          id: uom.id,
          name: uom.name,
          description: uom.description,
          kind: uom.kind,
          createdAt: uom.createdAt,
          updatedAt: uom.updatedAt,
        })
        .from(uom)
        .where(where)
        .orderBy(direction(uom[sortBy]), asc(uom.id))
        .limit(limit)
        .offset(offset),
      db.$count(uom, where),
    ]);

    return { items: uoms, total, limit, offset };
  }

  /**
   * One uom that isn't deleted, with who created and last updated it and
   * its conversions (with units that aren't deleted). Throws 404 otherwise.
   */
  async get(id: string, db: Executor = this.db): Promise<UomDetail> {
    const live = { deletedAt: { isNull: true } } as const;
    const found = await db.query.uom.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        createdBy: userSummary,
        updatedBy: userSummary,
        conversions: {
          where: { ...live, toUom: live },
          columns: { id: true, toUomId: true, factor: true },
          with: { toUom: uomSummary },
          orderBy: { toUomId: 'asc' },
        },
        conversionsTo: {
          where: { ...live, fromUom: live },
          columns: { id: true, fromUomId: true, factor: true },
          with: { fromUom: uomSummary },
          orderBy: { fromUomId: 'asc' },
        },
      },
    });
    if (!found) {
      throw new NotFoundException(msg('uoms.notFound'));
    }
    const { conversions, conversionsTo, ...rest } = found;
    return {
      ...rest,
      conversions: conversions.map(({ toUom, ...conversion }) => ({ ...conversion, to: toUom })),
      conversionsFrom: conversionsTo.map(({ fromUom, ...conversion }) => ({ ...conversion, from: fromUom })),
    };
  }

  /**
   * Creates an uom; `actor` is the creator. Runs the hooks registered on
   * `uoms` (CrudHooksModule.forFeature), in one transaction.
   */
  async create(body: UomBody, actor: Actor): Promise<UomDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    return this.hooks.create({ body, actor }, async ({ tx, body }) => {
      // The id is the body's: the client picks it (409 when taken).
      const [{ id }] = await tx
        .insert(uom)
        .values({
          id: body.id,
          name: body.name,
          description: body.description,
          kind: body.kind,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: uom.id })
        .catch(rethrowTakenId);
      return id;
    });
  }

  /**
   * Replaces an uom's fields; `actor` is the editor. Throws 404
   * if the uom doesn't exist or is deleted.
   */
  async update(id: string, body: UomBody, actor: Actor): Promise<UomDetail> {
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      const result = await tx
        .update(uom)
        .set({
          name: body.name,
          description: body.description,
          kind: body.kind,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(uom.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('uoms.notFound'));
      }
      await this.checkKind(tx, id, body.kind);
    });
  }

  /**
   * A unit can't take a kind other than the units it has live conversions
   * with (either way): 400 on `kind` otherwise.
   */
  private async checkKind(tx: Transaction, id: string, kind: UomKind): Promise<void> {
    const [other] = await tx
      .select({ id: uom.id })
      .from(uomConversion)
      .innerJoin(
        uom,
        or(
          and(eq(uomConversion.fromUomId, id), eq(uom.id, uomConversion.toUomId)),
          and(eq(uomConversion.toUomId, id), eq(uom.id, uomConversion.fromUomId)),
        ),
      )
      .where(and(isNull(uomConversion.deletedAt), notDeleted, ne(uom.kind, kind)))
      .limit(1);
    if (other) {
      throw new BadRequestException([`kind: ${msg('uomConversions.otherKind')}`]);
    }
  }

  /**
   * Deletes an uom logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: string, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(uom)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(uom.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('uoms.notFound'));
      }
    });
  }
}
