import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  timestamp,
  varchar,
  serial,
  text,
  integer,
  date,
  numeric,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';
import { customer } from './customers.js';
import { salesOrderType } from './sales-order-types.js';
import { product } from './products.js';
import { uom } from './uoms.js';

/**
 * An offer to a customer: once accepted it becomes a sales order
 * (`salesOrder.quotationId`), and keeps the items and prices it offered.
 * A quotation managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const quotation = salesSchema.table(
  'quotation',
  {
    id: serial('id').primaryKey(),
    /**
     * Sent by the form, but moved by the state machine, never written
     * by the insert or update. @api nosave
     */
    status: text('status', {
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    })
      .notNull()
      .default('draft'),
    /** @api detail */
    notes: text('notes'),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    typeId: varchar('type_id', { length: 5 })
      .notNull()
      .references(() => salesOrderType.id, { onDelete: 'restrict' }),
    validUntil: date('valid_until', { mode: 'date' }).notNull(),
    /** @api readonly, detail */
    acceptedAt: date('accepted_at', { mode: 'date' }),
    /** @api readonly, detail */
    rejectedAt: date('rejected_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the quotations they touched.
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
    index('quotation_deletedAt_idx').on(table.deletedAt),
    index('quotation_customerId_idx').on(table.customerId),
    index('quotation_typeId_idx').on(table.typeId),
  ],
);

export const quotationRelations = defineRelationsPart(
  { user, quotation, customer, salesOrderType },
  (r) => ({
    quotation: {
      createdBy: r.one.user({
        from: r.quotation.createdById,
        to: r.user.id,
        alias: 'quotationCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.quotation.updatedById,
        to: r.user.id,
        alias: 'quotationUpdatedBy',
      }),
      customer: r.one.customer({
        from: r.quotation.customerId,
        to: r.customer.id,
        optional: false,
        alias: 'quotationCustomer',
      }),
      type: r.one.salesOrderType({
        from: r.quotation.typeId,
        to: r.salesOrderType.id,
        optional: false,
        alias: 'quotationType',
      }),
    },
    customer: {
      quotations: r.many.quotation({
        from: r.customer.id,
        to: r.quotation.customerId,
        alias: 'quotationCustomer',
      }),
    },
    salesOrderType: {
      quotations: r.many.quotation({
        from: r.salesOrderType.id,
        to: r.quotation.typeId,
        alias: 'quotationType',
      }),
    },
  }),
);

/**
 * The products of a quotation, as `sales_order_item` (same columns and
 * pricing): accepting the quotation copies them into its sales order.
 */
export const quotationItem = salesSchema.table(
  'quotation_item',
  {
    quotationId: integer('quotation_id')
      .notNull()
      .references(() => quotation.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    /** In `uomId`, the unit the user picked. */
    quantity: numeric('quantity', {
      precision: 18,
      scale: 6,
      mode: 'number',
    }).notNull(),
    /**
     * The product's base unit, or one that converts to it: the base unit
     * when the body leaves it out. @api optional
     */
    uomId: varchar('uom_id', { length: 10 })
      .notNull()
      .references(() => uom.id, { onDelete: 'restrict' }),
    /** The quantity in the product's base unit, computed on save. @api readonly */
    baseQuantity: numeric('base_quantity', {
      precision: 18,
      scale: 6,
      mode: 'number',
    }).notNull(),
    /**
     * The item's price: the product's price (of its base unit) × the base
     * quantity, when the item was set. @api readonly
     */
    price: numeric('price', { precision: 14, scale: 2, mode: 'number' }).notNull(),
    /** Chosen by the user, not the list's order. @api input */
    position: integer('position').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.quotationId, table.position] }),
    index('quotation_item_productId_idx').on(table.productId),
    index('quotation_item_uomId_idx').on(table.uomId),
  ],
);

export const quotationItemRelations = defineRelationsPart(
  { quotation, quotationItem, product, uom },
  (r) => ({
    quotation: {
      items: r.many.quotationItem({
        from: r.quotation.id,
        to: r.quotationItem.quotationId,
      }),
    },
    quotationItem: {
      quotation: r.one.quotation({
        from: r.quotationItem.quotationId,
        to: r.quotation.id,
        optional: false,
      }),
      product: r.one.product({
        from: r.quotationItem.productId,
        to: r.product.id,
        optional: false,
        alias: 'quotationItemProduct',
      }),
      uom: r.one.uom({
        from: r.quotationItem.uomId,
        to: r.uom.id,
        optional: false,
        alias: 'quotationItemUom',
      }),
    },
  }),
);
