import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  mysqlEnum,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { user } from './auth.js';

/**
 * A activity managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const activity = mysqlTable(
  'activity',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: mysqlEnum(['email', 'phone']).notNull(),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { fsp: 3 }),
    // Nullable so removing a user keeps the activities they touched.
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
    index('activity_deletedAt_idx').on(table.deletedAt),
    index('activity_name_idx').on(table.name),
  ],
);

export const activityRelations = defineRelationsPart(
  { user, activity },
  (r) => ({
    activity: {
      createdBy: r.one.user({
        from: r.activity.createdById,
        to: r.user.id,
        alias: 'activityCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.activity.updatedById,
        to: r.user.id,
        alias: 'activityUpdatedBy',
      }),
    },
  }),
);
