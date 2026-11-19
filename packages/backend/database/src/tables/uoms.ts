import { defineRelationsPart } from 'drizzle-orm';
import { index, timestamp, varchar, text } from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';

/**
 * A unit of measure (g, kg, l, pc…) managed by the users; the id is its
 * symbol. Every product has one, its base unit. Deletion is logical:
 * `deletedAt` is set and the row is hidden from every query, but kept in the
 * table.
 */
export const uom = salesSchema.table(
  'uom',
  {
    // The symbol the users pick (no default): in the contract's body.
    id: varchar('id', { length: 10 }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    kind: text('kind', {
      enum: ['weight', 'volume', 'length', 'area', 'count', 'time'],
    }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the uoms they touched.
    createdById: varchar('created_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    updatedById: varchar('updated_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [index('uom_deletedAt_idx').on(table.deletedAt)],
);

export const uomRelations = defineRelationsPart({ user, uom }, (r) => ({
  uom: {
    createdBy: r.one.user({
      from: r.uom.createdById,
      to: r.user.id,
      alias: 'uomCreatedBy',
    }),
    updatedBy: r.one.user({
      from: r.uom.updatedById,
      to: r.user.id,
      alias: 'uomUpdatedBy',
    }),
  },
}));
