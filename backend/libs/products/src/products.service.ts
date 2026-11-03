import { schema, type Database } from '@app/database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, isNull, like, type SQL } from 'drizzle-orm';
import {
  PRODUCT_FILTER_FIELDS,
  type ProductBody,
  type ProductDetail,
  type ProductsList,
  type ListProductsQuery,
} from '@app/contracts';

export const DEFAULT_PAGE_SIZE = 20;

const { product } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** Products that haven't been deleted. */
const notDeleted = isNull(product.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class ProductsService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Lists products that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async listProducts(query: ListProductsQuery = {}): Promise<ProductsList> {
    const {
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'name',
      sortDirection = 'asc',
    } = query;
    const { db } = this;
    const filters = PRODUCT_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      return value ? [like(product[field], `%${escapeLike(value)}%`)] : [];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const order = sortDirection === 'asc' ? asc : desc;

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
        .orderBy(order(product[sortBy]), asc(product.id))
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
  async getProduct(id: string): Promise<ProductDetail> {
    const found = await this.db.query.product.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) throw new NotFoundException('Product not found');
    return found;
  }

  /** Creates a product; `userId` is the creator. */
  async createProduct(
    body: ProductBody,
    userId: string,
  ): Promise<ProductDetail> {
    const id = randomUUID();
    // Set here, not by the column default: MySQL's now() and the driver can
    // disagree on the time zone, while dates written from JS round-trip.
    const now = new Date();
    await this.db.insert(product).values({
      id,
      name: body.name,
      description: body.description,
      price: body.price,
      createdAt: now,
      updatedAt: now,
      createdById: userId,
      updatedById: userId,
    });
    return this.getProduct(id);
  }

  /**
   * Replaces a product's fields; `userId` is the editor. Throws 404
   * if the product doesn't exist or is deleted.
   */
  async updateProduct(
    id: string,
    body: ProductBody,
    userId: string,
  ): Promise<ProductDetail> {
    const [result] = await this.db
      .update(product)
      .set({
        name: body.name,
        description: body.description,
        price: body.price,
        updatedById: userId,
        // Set explicitly so the row always changes and is counted below.
        updatedAt: new Date(),
      })
      .where(and(eq(product.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException('Product not found');
    return this.getProduct(id);
  }

  /**
   * Deletes a product logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async deleteProduct(id: string, userId: string) {
    const now = new Date();
    const [result] = await this.db
      .update(product)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(and(eq(product.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException('Product not found');
  }
}
