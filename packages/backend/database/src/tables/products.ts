import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  timestamp,
  varchar,
  text,
  decimal,
  serial,
} from 'drizzle-orm/pg-core';
import { salesSchema } from './sales.js';
import { user } from '../auth.js';
import { uom } from './uoms.js';

/**
 * A product managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const product = salesSchema.table(
  'product',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    /** @api detail @form editor */
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    /** The base unit: sales order quantities are converted to it. */
    uomId: varchar('uom_id', { length: 10 })
      .notNull()
      .references(() => uom.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the products they touched.
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
    index('product_deletedAt_idx').on(table.deletedAt),
    index('product_name_idx').on(table.name),
    index('product_uomId_idx').on(table.uomId),
  ],
);

/**
 * A unit a product can also be sold in, besides its base unit: one its base
 * unit converts to (uom_conversion gives the factor). Replaced with the
 * product.
 */
export const productUom = salesSchema.table(
  'product_uom',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    uomId: varchar('uom_id', { length: 10 })
      .notNull()
      .references(() => uom.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.uomId] }),
    index('product_uom_uomId_idx').on(table.uomId),
  ],
);

export const productRelations = defineRelationsPart({ user, product, productUom, uom }, (r) => ({
  product: {
    uom: r.one.uom({
      from: r.product.uomId,
      to: r.uom.id,
      optional: false,
      alias: 'productUom',
    }),
    units: r.many.productUom({
      from: r.product.id,
      to: r.productUom.productId,
    }),
    createdBy: r.one.user({
      from: r.product.createdById,
      to: r.user.id,
      alias: 'productCreatedBy',
    }),
    updatedBy: r.one.user({
      from: r.product.updatedById,
      to: r.user.id,
      alias: 'productUpdatedBy',
    }),
  },
  productUom: {
    product: r.one.product({
      from: r.productUom.productId,
      to: r.product.id,
      optional: false,
    }),
    uom: r.one.uom({
      from: r.productUom.uomId,
      to: r.uom.id,
      optional: false,
      alias: 'productUnitUom',
    }),
  },
}));
