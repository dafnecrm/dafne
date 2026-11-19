import { schema, type Database } from '@dafne/backend-database';
import { PostgresErrorCode, rethrowPostgresError } from '@dafne/backend-common';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  type UomConversionBody,
  type UomConversionDetail,
  type UomConversionsList,
  type ListUomConversionsQuery,
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

export const UOM_CONVERSIONS_DEFAULT_PAGE_SIZE = 20;

/** The resource's name in CrudHooks. */
export const UOM_CONVERSIONS_RESOURCE = 'uom-conversions';

const { uom, uomConversion } = schema;

/** The two units of a conversion, joined under their own names. */
const fromUom = alias(uom, 'from_uom');
const toUom = alias(uom, 'to_uom');

/** Uom conversions that haven't been deleted. */
const notDeleted = isNull(uomConversion.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

/** Only the unit's ID and name. */
const uomSummary = { columns: { id: true, name: true } } as const;

/** A pair that already has a live conversion (either way) becomes a 409. */
const rethrowTakenPair = rethrowPostgresError([
  {
    code: PostgresErrorCode.UNIQUE_VIOLATION,
    constraint: 'uom_conversion_pair_idx',
    error: () => new ConflictException(msg('uomConversions.taken')),
  },
]);

/**
 * Converts between units, the same for every product: 1 `to` = `factor` ×
 * `from`, one row per pair (the other way is 1 / factor).
 */
@Injectable()
export class UomConversionsService implements CrudService<
  number,
  ListUomConversionsQuery,
  UomConversionsList,
  UomConversionBody,
  UomConversionDetail
> {
  /** Runs the writes with the hooks registered on `uom-conversions`. */
  private readonly hooks: CrudHooks<
    number,
    UomConversionBody,
    UomConversionDetail
  >;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
  ) {
    this.hooks = registry.for(UOM_CONVERSIONS_RESOURCE, {
      db,
      load: (id, tx) => this.get(id, tx),
    });
  }

  /**
   * Lists conversions that aren't deleted, paged and sorted, filtered by
   * every field given (AND, matched exactly; `uomId` matches either unit).
   */
  async list(query: ListUomConversionsQuery = {}): Promise<UomConversionsList> {
    const {
      limit = UOM_CONVERSIONS_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'fromUomId',
      sortDirection = 'asc',
    } = query;
    const { db } = this;
    const filters: SQL[] = [];
    const id = query.id?.trim();
    if (id) {
      filters.push(eq(uomConversion.id, Number(id)));
    }
    const from = query.fromUomId?.trim();
    if (from) {
      filters.push(eq(uomConversion.fromUomId, from));
    }
    const to = query.toUomId?.trim();
    if (to) {
      filters.push(eq(uomConversion.toUomId, to));
    }
    const either = query.uomId?.trim();
    if (either) {
      filters.push(
        or(eq(uomConversion.fromUomId, either), eq(uomConversion.toUomId, either)) as SQL,
      );
    }
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [rows, total] = await Promise.all([
      db
        .select({
          id: uomConversion.id,
          fromUomId: uomConversion.fromUomId,
          toUomId: uomConversion.toUomId,
          factor: uomConversion.factor,
          createdAt: uomConversion.createdAt,
          updatedAt: uomConversion.updatedAt,
          from: { id: fromUom.id, name: fromUom.name },
          to: { id: toUom.id, name: toUom.name },
        })
        .from(uomConversion)
        .innerJoin(fromUom, eq(fromUom.id, uomConversion.fromUomId))
        .innerJoin(toUom, eq(toUom.id, uomConversion.toUomId))
        .where(where)
        .orderBy(
          direction(uomConversion[sortBy]),
          asc(uomConversion.toUomId),
          asc(uomConversion.id),
        )
        .limit(limit)
        .offset(offset),
      db.$count(uomConversion, where),
    ]);

    return { items: rows, total, limit, offset };
  }

  /**
   * One conversion that isn't deleted, with its units and who created and
   * last updated it. Throws 404 otherwise.
   */
  async get(id: number, db: Executor = this.db): Promise<UomConversionDetail> {
    const found = await db.query.uomConversion.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        createdBy: userSummary,
        updatedBy: userSummary,
        fromUom: uomSummary,
        toUom: uomSummary,
      },
    });
    if (!found) {
      throw new NotFoundException(msg('uomConversions.notFound'));
    }
    const { fromUom: from, toUom: to, ...rest } = found;
    return { ...rest, from, to };
  }

  /**
   * How many of `baseId` each unit it converts to directly is (1 unit =
   * factor × base), whichever way the conversion goes: a row g → kg gives
   * kg: 1000 from g, and g: 0.001 from kg. Not through other units.
   */
  async factorsFrom(baseId: string, db: Executor = this.db): Promise<Map<string, number>> {
    const rows = await db
      .select({
        fromUomId: uomConversion.fromUomId,
        toUomId: uomConversion.toUomId,
        factor: uomConversion.factor,
      })
      .from(uomConversion)
      .innerJoin(fromUom, eq(fromUom.id, uomConversion.fromUomId))
      .innerJoin(toUom, eq(toUom.id, uomConversion.toUomId))
      .where(
        and(
          notDeleted,
          isNull(fromUom.deletedAt),
          isNull(toUom.deletedAt),
          or(eq(uomConversion.fromUomId, baseId), eq(uomConversion.toUomId, baseId)),
        ),
      );
    return new Map(
      rows.map((row) =>
        row.fromUomId === baseId
          ? [row.toUomId, row.factor]
          : [row.fromUomId, Number((1 / row.factor).toPrecision(15))],
      ),
    );
  }

  /** Creates a conversion; `actor` is the creator. 409 when the pair has one. */
  async create(body: UomConversionBody, actor: Actor): Promise<UomConversionDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    return this.hooks.create({ body, actor }, async ({ tx, body }) => {
      await this.checkUnits(tx, body);
      const [{ id }] = await tx
        .insert(uomConversion)
        .values({
          fromUomId: body.fromUomId,
          toUomId: body.toUomId,
          factor: body.factor,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: uomConversion.id })
        .catch(rethrowTakenPair);
      return id;
    });
  }

  /**
   * Replaces a conversion's fields; `actor` is the editor. Throws 404 if it
   * doesn't exist or is deleted, 409 when the new pair has one.
   */
  async update(
    id: number,
    body: UomConversionBody,
    actor: Actor,
  ): Promise<UomConversionDetail> {
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      await this.checkUnits(tx, body);
      const result = await tx
        .update(uomConversion)
        .set({
          fromUomId: body.fromUomId,
          toUomId: body.toUomId,
          factor: body.factor,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(uomConversion.id, id), notDeleted))
        .catch(rethrowTakenPair);
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('uomConversions.notFound'));
      }
    });
  }

  /**
   * Deletes a conversion logically: sets deletedAt, so it disappears from
   * the API (and from the units products are sold in) but stays in the
   * database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(uomConversion)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(uomConversion.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('uomConversions.notFound'));
      }
    });
  }

  /** Both units exist (not deleted) and are of the same kind: 400 otherwise. */
  private async checkUnits(tx: Transaction, body: UomConversionBody): Promise<void> {
    const units = await tx
      .select({ id: uom.id, kind: uom.kind })
      .from(uom)
      .where(and(inArray(uom.id, [body.fromUomId, body.toUomId]), isNull(uom.deletedAt)));
    const kinds = new Map(units.map((unit) => [unit.id, unit.kind]));
    for (const field of ['fromUomId', 'toUomId'] as const) {
      if (!kinds.has(body[field])) {
        throw new BadRequestException([`${field}: ${msg('uomConversions.uomNotFound')}`]);
      }
    }
    if (kinds.get(body.fromUomId) !== kinds.get(body.toUomId)) {
      throw new BadRequestException([`toUomId: ${msg('uomConversions.otherKind')}`]);
    }
  }
}
