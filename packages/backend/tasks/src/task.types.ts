import type { TaskLogLevel, TaskTrigger } from '@dafne/contracts';

/** What `@Task` says about a task: its key and the defaults of its settings. */
export interface TaskOptions {
  /**
   * The task's key, unique: dot-separated, lowercase words (e.g.
   * `quotations.expire`). The frontend names the task by it.
   */
  key: string;
  /** Default cron pattern (e.g. `0 2 * * *`); none: it runs only when started. */
  cron?: string;
  /** Default time zone of the pattern (Europe/Rome). */
  timezone?: string;
  /** Default timeout, in seconds; none: no limit. */
  timeoutSeconds?: number;
  /** Off by default (false): an admin turns it on. */
  enabled?: boolean;
}

/** Writes a line in the run's log (shown to admins) and in the app's log. */
export type TaskLogFn = (message: string, data?: unknown) => Promise<void>;

export type TaskLogger = Record<TaskLogLevel, TaskLogFn>;

/** What a task's handler gets for a run. */
export interface TaskContext<P = unknown> {
  readonly key: string;
  readonly runId: number;
  readonly trigger: TaskTrigger;
  /** The user who started it, if one did. */
  readonly triggeredBy: string | null;
  /** The app that started it, if another backend did. */
  readonly source: string | null;
  /** What the trigger passed (null from a schedule or an admin). */
  readonly payload: P;
  /**
   * Aborted when the run times out: pass it on (fetch, queries) or check
   * it between steps, or the work goes on after the run has failed.
   */
  readonly signal: AbortSignal;
  readonly log: TaskLogger;
}

/**
 * A task's handler: a provider decorated with `@Task`. What `run` returns
 * is saved as the run's result (JSON); what it throws fails the run.
 */
export interface TaskHandler<P = unknown, R = unknown> {
  run(ctx: TaskContext<P>): Promise<R>;
}
