/** The BullMQ queue every task's jobs go through. */
export const TASKS_QUEUE = 'sales-tasks';

/** Redis keys of the queue start with it (`dafne:sales-tasks:…`). */
export const TASKS_QUEUE_PREFIX = 'dafne';

/** A job of the queue: a run to make, or (no runId) a tick of a task's schedule. */
export interface TaskJobData {
  taskKey: string;
  /** The run, already recorded by TasksClient; missing for a schedule's tick. */
  runId?: number;
}

/** The id of a task's job scheduler (its cron, in Redis). */
export const schedulerId = (key: string) => `task:${key}`;

/** The default time zone of a task's cron pattern. */
export const DEFAULT_TIMEZONE = 'Europe/Rome';

/** A queued or running run older than this with no job is lost (see TasksScheduler.reconcile). */
export const LOST_AFTER_MS = 60_000;
