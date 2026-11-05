import { defineRelationsPart } from 'drizzle-orm';
import { index, timestamp, varchar } from 'drizzle-orm/pg-core';
import { salesSchema } from './sales.js';
import { user } from '../auth.js';

/**
 * A country managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const country = salesSchema.table(
  'country',
  {
    code: varchar('id', { length: 2 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the countries they touched.
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
    index('country_deletedAt_idx').on(table.deletedAt),
    index('country_name_idx').on(table.name),
  ],
);

export const countryRelations = defineRelationsPart({ user, country }, (r) => ({
  country: {
    createdBy: r.one.user({
      from: r.country.createdById,
      to: r.user.id,
      alias: 'countryCreatedBy',
    }),
    updatedBy: r.one.user({
      from: r.country.updatedById,
      to: r.user.id,
      alias: 'countryUpdatedBy',
    }),
  },
}));
