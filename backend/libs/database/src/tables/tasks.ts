import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  mysqlTable,
  timestamp,
  varchar,
  text,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';
import { user } from './auth.js';
import { activity } from './activities.js';

/**
 * A task managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const task = mysqlTable(
  'task',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    dueDate: timestamp('due_date', { fsp: 3 }).notNull(),
    /** @api detail @form editor */
    notes: text('notes').notNull(),
    type: mysqlEnum('type', ['email', 'phone', 'other']).notNull(),
    /** @api filter */
    activityId: varchar('activity_id', { length: 36 })
      .notNull()
      .references(() => activity.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', ['open', 'closed']).notNull().default('open'),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { fsp: 3 }),
    // Nullable so removing a user keeps the tasks they touched.
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
    index('task_deletedAt_idx').on(table.deletedAt),
    index('task_name_idx').on(table.name),
    index('task_activityId_idx').on(table.activityId),
  ],
);

export const taskRelations = defineRelationsPart(
  { user, task, activity },
  (r) => ({
    task: {
      createdBy: r.one.user({
        from: r.task.createdById,
        to: r.user.id,
        alias: 'taskCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.task.updatedById,
        to: r.user.id,
        alias: 'taskUpdatedBy',
      }),
      activity: r.one.activity({
        from: r.task.activityId,
        to: r.activity.id,
        optional: false,
        alias: 'taskActivity',
      }),
    },
    activity: {
      tasks: r.many.task({
        from: r.activity.id,
        to: r.task.activityId,
        alias: 'taskActivity',
      }),
    },
  }),
);
