import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Injectable, NotFoundException } from '@nestjs/common';
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
  type ProductsList,
  type ListProductsQuery,
  msg,
} from '@dafne/contracts';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
} from '@dafne/backend-crud';

export const PRODUCTS_DEFAULT_PAGE_SIZE = 20;

const { product } = schema;

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
  ) {
    this.hooks = registry.for('products', { db, load: (id, tx) => this.get(id, tx) });
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

    return { products, total, limit, offset };
  }

  /**
   * One product that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async get(id: number, db: Executor = this.db): Promise<ProductDetail> {
    const found = await db.query.product.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) {
      throw new NotFoundException(msg('products.notFound'));
    }
    return found;
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
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: product.id });
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
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(product.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('products.notFound'));
      }
    });
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
