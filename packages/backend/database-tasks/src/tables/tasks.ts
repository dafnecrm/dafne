import { user } from '@dafne/backend-database-auth';
import { TASK_LOG_LEVELS, TASK_RUN_STATUSES, TASK_TRIGGERS } from '@dafne/contracts';
import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tasksDb } from './tasks-db.ts';

/**
 * A task's settings, one row per task defined in code (`@Task`): written by
 * the tasks app when it starts, with the code's defaults, until an admin
 * changes them (`customized`).
 */
export const task = tasksDb.table('task', {
  /** The task's key, as in code (e.g. `tasks.cleanup`). */
  key: text('key').primaryKey(),
  /** Cron pattern of its schedule; null: it runs only when started. */
  cron: text('cron'),
  /** The time zone the cron pattern is read in. */
  timezone: text('timezone').notNull().default('Europe/Rome'),
  /** Off: no scheduled runs, nor runs started by other backends (admins still can). */
  enabled: boolean('enabled').notNull().default(true),
  /** A run is failed after this long; null: no limit. */
  timeoutSeconds: integer('timeout_seconds'),
  /** An admin changed the settings: the code's defaults no longer apply. */
  customized: boolean('customized').notNull().default(false),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  // Nullable so removing a user keeps the settings they made.
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
});

/**
 * One run of a task, from the trigger to its end. At most one run of a task
 * is queued or running (`task_run_active_idx`): a trigger meanwhile is
 * recorded as `skipped`.
 */
export const taskRun = tasksDb.table(
  'task_run',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taskKey: text('task_key')
      .notNull()
      .references(() => task.key, { onDelete: 'cascade' }),
    status: text('status', { enum: TASK_RUN_STATUSES }).notNull(),
    trigger: text('trigger', { enum: TASK_TRIGGERS }).notNull(),
    /** The user who started it, if one did. */
    triggeredBy: text('triggered_by').references(() => user.id, { onDelete: 'set null' }),
    /** The app that started it (e.g. `sales`), for runs started by another backend. */
    source: text('source'),
    /** The BullMQ job that runs it: a lost job fails the run (`tasks.workerLost`). */
    jobId: text('job_id'),
    payload: jsonb('payload'),
    result: jsonb('result'),
    /** The error's message (a contracts message key for the runner's own errors). */
    error: text('error'),
    errorStack: text('error_stack'),
    queuedAt: timestamp('queued_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { precision: 3, withTimezone: true }),
    finishedAt: timestamp('finished_at', { precision: 3, withTimezone: true }),
  },
  (table) => [
    uniqueIndex('task_run_active_idx')
      .on(table.taskKey)
      .where(sql`${table.status} in ('queued', 'running')`),
    index('task_run_task_idx').on(table.taskKey, table.id.desc()),
    index('task_run_queued_at_idx').on(table.queuedAt),
  ],
);

/** A line a run logged (`ctx.log.info(…)`). */
export const taskRunLog = tasksDb.table(
  'task_run_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    runId: bigint('run_id', { mode: 'number' })
      .notNull()
      .references(() => taskRun.id, { onDelete: 'cascade' }),
    at: timestamp('at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
    level: text('level', { enum: TASK_LOG_LEVELS }).notNull(),
    message: text('message').notNull(),
    data: jsonb('data'),
  },
  (table) => [index('task_run_log_run_idx').on(table.runId, table.id)],
);
