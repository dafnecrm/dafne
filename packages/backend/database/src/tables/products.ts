import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  timestamp,
  varchar,
  text,
  decimal,
  serial,
} from 'drizzle-orm/pg-core';
import { salesSchema } from './sales.js';
import { user } from '../auth.js';

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
