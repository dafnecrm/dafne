import { defineRelationsPart } from 'drizzle-orm';
import { boolean, index, timestamp, varchar } from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';

/**
 * A sales order type managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const salesOrderType = salesSchema.table(
  'sales_order_type',
  {
    // A code the users pick (no default): in the contract's body.
    id: varchar('id', { length: 5 }).primaryKey(),
    description: varchar('description', { length: 255 }).notNull(),
    active: boolean().default(true),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the sales order types they touched.
    createdById: varchar('created_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    updatedById: varchar('updated_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [index('sales_order_type_deletedAt_idx').on(table.deletedAt)],
);

export const salesOrderTypeRelations = defineRelationsPart(
  { user, salesOrderType },
  (r) => ({
    salesOrderType: {
      createdBy: r.one.user({
        from: r.salesOrderType.createdById,
        to: r.user.id,
        alias: 'salesOrderTypeCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.salesOrderType.updatedById,
        to: r.user.id,
        alias: 'salesOrderTypeUpdatedBy',
      }),
    },
  }),
);
