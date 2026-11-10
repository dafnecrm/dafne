import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  integer,
  timestamp,
  varchar,
  text,
  primaryKey,
  serial,
} from 'drizzle-orm/pg-core';
import { salesSchema } from './sales.js';
import { user } from '../auth.js';
import { customer } from './customers.js';
import { product } from './products.js';
import { salesOrderType } from './sales-order-types.ts';

/**
 * A sales order managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const salesOrder = salesSchema.table(
  'sales_order',
  {
    id: serial('id').primaryKey(),
    /** @api readonly */
    status: text('status', {
      enum: ['draft', 'open', 'completed', 'cancelled', 'rejected'],
    })
      .default('draft')
      .notNull(),
    /** @api detail @form editor */
    notes: text('notes'),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    typeId: varchar({ length: 5 })
      .notNull()
      .references(() => salesOrderType.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the sales orders they touched.
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
    index('sales_order_deletedAt_idx').on(table.deletedAt),
    index('sales_order_customerId_idx').on(table.customerId),
  ],
);

/**
 * Links sales orders and products (many-to-many). Its `order_id` column
 * keeps its name.
 */
export const salesOrderItem = salesSchema.table(
  'sales_order_item',
  {
    orderId: integer('order_id')
      .notNull()
      .references(() => salesOrder.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    /** Chosen by the user, not the list's order. @api input */
    position: integer('position').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.orderId, table.position] }),
    index('sales_order_item_productId_idx').on(table.productId),
  ],
);

export const salesOrderRelations = defineRelationsPart(
  { user, salesOrder, customer, salesOrderItem, salesOrderType },
  (r) => ({
    salesOrder: {
      createdBy: r.one.user({
        from: r.salesOrder.createdById,
        to: r.user.id,
        alias: 'salesOrderCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.salesOrder.updatedById,
        to: r.user.id,
        alias: 'salesOrderUpdatedBy',
      }),
      customer: r.one.customer({
        from: r.salesOrder.customerId,
        to: r.customer.id,
        optional: false,
        alias: 'salesOrderCustomer',
      }),
      items: r.many.salesOrderItem({
        from: r.salesOrder.id,
        to: r.salesOrderItem.orderId,
      }),
      type: r.one.salesOrderType({
        from: r.salesOrder.typeId,
        to: r.salesOrderType.id,
        optional: false,
        alias: 'salesOrderType',
      }),
    },
    customer: {
      salesOrders: r.many.salesOrder({
        from: r.customer.id,
        to: r.salesOrder.customerId,
        alias: 'salesOrderCustomer',
      }),
    },
  }),
);

export const salesOrderItemRelations = defineRelationsPart(
  { salesOrder, salesOrderItem, product },
  (r) => ({
    salesOrderItem: {
      salesOrder: r.one.salesOrder({
        from: r.salesOrderItem.orderId,
        to: r.salesOrder.id,
        optional: false,
      }),
      // One product per item (productId is NOT NULL).
      product: r.one.product({
        from: r.salesOrderItem.productId,
        to: r.product.id,
        optional: false,
      }),
    },
  }),
);
