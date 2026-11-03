import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  mysqlTable,
  timestamp,
  varchar,
  text,
  decimal,
} from 'drizzle-orm/mysql-core';
import { user } from './auth.js';

/**
 * A product managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const product = mysqlTable(
  'product',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    /** @api detail @form editor */
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { fsp: 3 }),
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
  ],
);

export const productRelations = defineRelationsPart({ user, product }, (r) => ({
  product: {
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
}));
