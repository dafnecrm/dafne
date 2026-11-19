import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PostgresErrorCode, rethrowPostgresError } from '@dafne/backend-common';
import { UomConversionsService } from '@dafne/backend-uom';
import {
  and,
  asc,
  desc,
  eq,
  isNull,
  ilike,
  type Column,
  type SQL,
} from 'drizzle-orm';
import {
  PRODUCT_FILTER_FIELDS,
  type ProductFilterField,
  type ProductBody,
  type ProductDetail,
  type ProductSaleUnit,
  type ProductUnitBody,
  type ProductsList,
  type ListProductsQuery,
  msg,
  multiplyDecimal,
} from '@dafne/contracts';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
  type Transaction,
} from '@dafne/backend-crud';
import { PRODUCTS_RESOURCE } from './product.changelog.js';

export const PRODUCTS_DEFAULT_PAGE_SIZE = 20;

const { product, productUom } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<
  Record<ProductFilterField, (value: string) => number | string>
> = {
  id: Number,
};

/** Products that haven't been deleted. */
const notDeleted = isNull(product.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

/** A unit as the product shows it. */
const uomSummary = { columns: { id: true, name: true } } as const;


/** A base unit that doesn't exist becomes a 400 on uomId. */
const rethrowUnknownUom = rethrowPostgresError([
  {
    code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
    constraint: 'product_uom_id_uom_id_fkey',
    error: () => new BadRequestException([`uomId: ${msg('products.uomId.notFound')}`]),
  },
]);

@Injectable()
export class ProductsService
  implements
    CrudService<
      number,
      ListProductsQuery,
      ProductsList,
      ProductBody,
      ProductDetail
    >
{
  /** Runs the writes with the hooks registered on `products`. */
  private readonly hooks: CrudHooks<number, ProductBody, ProductDetail>;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
    private readonly conversions: UomConversionsService,
  ) {
    this.hooks = registry.for(PRODUCTS_RESOURCE, { db, load: (id, tx) => this.get(id, tx) });
  }

  /**
   * Lists products that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(query: ListProductsQuery = {}): Promise<ProductsList> {
    const {
      limit = PRODUCTS_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'desc',
    } = query;
    const { db } = this;
    const filters = PRODUCT_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [
        exact
          ? eq(product[field] as Column, exact(value))
          : ilike(product[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [products, total] = await Promise.all([
      db
        .select({
          id: product.id,
          name: product.name,
          price: product.price,
          uomId: product.uomId,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        })
        .from(product)
        .where(where)
        .orderBy(direction(product[sortBy]), asc(product.id))
        .limit(limit)
        .offset(offset),
      db.$count(product, where),
    ]);

    return { items: products, total, limit, offset };
  }

  /**
   * One product that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async get(id: number, db: Executor = this.db): Promise<ProductDetail> {
    const found = await db.query.product.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        createdBy: userSummary,
        updatedBy: userSummary,
        uom: uomSummary,
        units: {
          columns: { uomId: true },
          with: { uom: uomSummary },
          orderBy: { uomId: 'asc' },
        },
      },
    });
    if (!found) {
      throw new NotFoundException(msg('products.notFound'));
    }
    return { ...found, units: await this.withFactors(found.uomId, found.units, db) };
  }

  /**
   * A product's units with their factors (1 unit = factor × base), from the
   * conversions with the base unit: a unit whose conversion was deleted
   * (or whose unit was) is left out.
   */
  private async withFactors<U extends { uomId: string }>(
    baseId: string,
    units: U[],
    db: Executor,
  ): Promise<(U & { factor: number })[]> {
    if (!units.length) {
      return [];
    }
    const factors = await this.conversions.factorsFrom(baseId, db);
    return units.flatMap((unit) => {
      const factor = factors.get(unit.uomId);
      return factor === undefined ? [] : [{ ...unit, factor }];
    });
  }

  /**
   * The units a product can be sold in, each with how many of its base unit
   * one of them is and its price (the product's × that): the base unit (1),
   * then the product's units that still have a conversion with it. Throws
   * 404 if the product doesn't exist or is deleted.
   */
  async units(id: number, db: Executor = this.db): Promise<ProductSaleUnit[]> {
    const found = await db.query.product.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { uomId: true, price: true },
      with: {
        uom: uomSummary,
        units: { columns: { uomId: true }, with: { uom: uomSummary }, orderBy: { uomId: 'asc' } },
      },
    });
    if (!found) {
      throw new NotFoundException(msg('products.notFound'));
    }
    const units = await this.withFactors(found.uomId, found.units, db);
    // As precise as the items' prices (numeric(18,6)).
    const price = (factor: number) => multiplyDecimal(found.price, factor, 6);
    return [
      { uomId: found.uomId, uom: found.uom, factor: 1, source: 'base', price: price(1) },
      ...units.map((unit) => ({ ...unit, source: 'product' as const, price: price(unit.factor) })),
    ];
  }

  /** Creates a product; `actor` is the creator. */
  async create(
    body: ProductBody,
    actor: Actor,
  ): Promise<ProductDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    return this.hooks.create({ body, actor }, async ({ tx, body }) => {
      const [{ id }] = await tx
        .insert(product)
        .values({
          name: body.name,
          description: body.description,
          price: body.price,
          uomId: body.uomId,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: product.id })
        .catch(rethrowUnknownUom);
      await this.replaceUnits(tx, id, body.uomId, body.units);
      return id;
    });
  }

  /**
   * Replaces a product's fields; `actor` is the editor. Throws 404
   * if the product doesn't exist or is deleted.
   */
  async update(
    id: number,
    body: ProductBody,
    actor: Actor,
  ): Promise<ProductDetail> {
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      const result = await tx
        .update(product)
        .set({
          name: body.name,
          description: body.description,
          price: body.price,
          uomId: body.uomId,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(product.id, id), notDeleted))
        .catch(rethrowUnknownUom);
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('products.notFound'));
      }
      await this.replaceUnits(tx, id, body.uomId, body.units);
    });
  }

  /**
   * Replaces a product's units. Each must have a conversion with the base
   * unit `baseId` (either way): 400 otherwise.
   */
  private async replaceUnits(
    tx: Transaction,
    id: number,
    baseId: string,
    units: ProductUnitBody[],
  ): Promise<void> {
    if (units.length) {
      const factors = await this.conversions.factorsFrom(baseId, tx);
      const missing = units.findIndex((unit) => !factors.has(unit.uomId));
      if (missing >= 0) {
        throw new BadRequestException([`units.${missing}.uomId: ${msg('products.units.uomId.notConvertible')}`]);
      }
    }
    await tx.delete(productUom).where(eq(productUom.productId, id));
    if (units.length) {
      await tx.insert(productUom).values(units.map((unit) => ({ productId: id, uomId: unit.uomId })));
    }
  }

  /**
   * Deletes a product logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(product)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(product.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('products.notFound'));
      }
    });
  }
}
