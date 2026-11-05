import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  timestamp,
  varchar,
  text,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { salesSchema } from './sales.js';
import { user } from '../auth.js';
import { customer } from './customers.js';
import { product } from './products.js';

/**
 * An order managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const order = salesSchema.table(
  'order',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    /** @form editor */
    notes: text('notes'),
    customerId: varchar('customer_id', { length: 36 })
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the orders they touched.
    createdById: varchar('created_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    updatedById: varchar('updated_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [
    index('order_deletedAt_idx').on(table.deletedAt),
    index('order_name_idx').on(table.name),
    index('order_customerId_idx').on(table.customerId),
  ],
);

/** Links orders and products (many-to-many). */
export const orderProduct = salesSchema.table(
  'order_product',
  {
    orderId: varchar('order_id', { length: 36 })
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 36 })
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.orderId, table.productId] }),
    index('order_product_productId_idx').on(table.productId),
  ],
);

export const orderRelations = defineRelationsPart(
  { user, order, customer, orderProduct, product },
  (r) => ({
    order: {
      createdBy: r.one.user({
        from: r.order.createdById,
        to: r.user.id,
        alias: 'orderCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.order.updatedById,
        to: r.user.id,
        alias: 'orderUpdatedBy',
      }),
      customer: r.one.customer({
        from: r.order.customerId,
        to: r.customer.id,
        optional: false,
        alias: 'orderCustomer',
      }),
      products: r.many.product({
        from: r.order.id.through(r.orderProduct.orderId),
        to: r.product.id.through(r.orderProduct.productId),
      }),
    },
    customer: {
      orders: r.many.order({
        from: r.customer.id,
        to: r.order.customerId,
        alias: 'orderCustomer',
      }),
    },
  }),
);
