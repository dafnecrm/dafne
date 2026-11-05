import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, isNull, like, type SQL } from 'drizzle-orm';
import {
  ORDER_FILTER_FIELDS,
  type OrderBody,
  type OrderDetail,
  type OrdersList,
  type ListOrdersQuery,
  msg,
} from '@dafne/contracts';

export const DEFAULT_PAGE_SIZE = 20;

const { order } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** Orders that haven't been deleted. */
const notDeleted = isNull(order.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class OrdersService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Lists orders that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async listOrders(query: ListOrdersQuery = {}): Promise<OrdersList> {
    const {
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'name',
      sortDirection = 'asc',
    } = query;
    const { db } = this;
    const filters = ORDER_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      return value ? [like(order[field], `%${escapeLike(value)}%`)] : [];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [orders, total] = await Promise.all([
      db
        .select({
          id: order.id,
          name: order.name,
          notes: order.notes,
          customerId: order.customerId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })
        .from(order)
        .where(where)
        .orderBy(direction(order[sortBy]), asc(order.id))
        .limit(limit)
        .offset(offset),
      db.$count(order, where),
    ]);

    return { orders, total, limit, offset };
  }

  /**
   * One order that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async getOrder(id: string): Promise<OrderDetail> {
    const found = await this.db.query.order.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) throw new NotFoundException(msg('orders.notFound'));
    return found;
  }

  /** Creates an order; `userId` is the creator. */
  async createOrder(body: OrderBody, userId: string): Promise<OrderDetail> {
    const id = randomUUID();
    // Set here, not by the column default: MySQL's now() and the driver can
    // disagree on the time zone, while dates written from JS round-trip.
    const now = new Date();
    await this.db.insert(order).values({
      id,
      name: body.name,
      notes: body.notes,
      customerId: body.customerId,
      createdAt: now,
      updatedAt: now,
      createdById: userId,
      updatedById: userId,
    });
    return this.getOrder(id);
  }

  /**
   * Replaces an order's fields; `userId` is the editor. Throws 404
   * if the order doesn't exist or is deleted.
   */
  async updateOrder(
    id: string,
    body: OrderBody,
    userId: string,
  ): Promise<OrderDetail> {
    const [result] = await this.db
      .update(order)
      .set({
        name: body.name,
        notes: body.notes,
        customerId: body.customerId,
        updatedById: userId,
        // Set explicitly so the row always changes and is counted below.
        updatedAt: new Date(),
      })
      .where(and(eq(order.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException(msg('orders.notFound'));
    return this.getOrder(id);
  }

  /**
   * Deletes an order logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async deleteOrder(id: string, userId: string) {
    const now = new Date();
    const [result] = await this.db
      .update(order)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(and(eq(order.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException(msg('orders.notFound'));
  }
}
