import { defineRelationsPart } from 'drizzle-orm';
import { index, timestamp, varchar, text, serial } from 'drizzle-orm/pg-core';
import { salesSchema } from './sales.js';
import { user } from '../auth.js';

/**
 * A activity managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const activity = salesSchema.table(
  'activity',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: text({ enum: ['call', 'email', 'meeting', 'task'] }).notNull(),
    dueDate: timestamp('due_date', { precision: 3, withTimezone: true }),
    /** @api readonly */
    status: text('status', { enum: ['open', 'closed'] })
      .notNull()
      .default('open'),
    /** @api readonly */
    completedAt: timestamp('completed_at', {
      precision: 3,
      withTimezone: true,
    }),
    /** @api readonly */
    completedById: varchar('completed_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    /** @api detail @form editor */
    notes: text('notes'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
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
    index('activity_completedById_idx').on(table.completedById),
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
      completedBy: r.one.user({
        from: r.activity.completedById,
        to: r.user.id,
        alias: 'activityCompletedBy',
      }),
    },
    user: {
      activities: r.many.activity({
        from: r.user.id,
        to: r.activity.completedById,
        alias: 'activityCompletedBy',
      }),
    },
  }),
);
