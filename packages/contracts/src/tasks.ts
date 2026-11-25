import { z } from "zod";
import { msg } from "./messages/index.ts";
import { optionalText, pageQuery, requiredText, type Page } from "./common.ts";

/*
 * The scheduled tasks of apps/sales-tasks (its API, /tasks): admins see
 * their runs, change their schedule and start them.
 */

/** Where a run is: at most one run of a task is queued or running. */
export const TASK_RUN_STATUSES = ["queued", "running", "succeeded", "failed", "skipped"] as const;
export type TaskRunStatus = (typeof TASK_RUN_STATUSES)[number];

/** A run that blocks the next ones of its task. */
export const ACTIVE_TASK_RUN_STATUSES = ["queued", "running"] as const satisfies readonly TaskRunStatus[];

/** What started a run: its schedule, an admin, or another backend. */
export const TASK_TRIGGERS = ["schedule", "manual", "api"] as const;
export type TaskTrigger = (typeof TASK_TRIGGERS)[number];

export const TASK_LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type TaskLogLevel = (typeof TASK_LOG_LEVELS)[number];

/** A run's timeout, in seconds: from 1 second to 1 day. */
export const TASK_TIMEOUT_MAX_SECONDS = 24 * 60 * 60;

/* ---------- Requests ---------- */

/**
 * Body of PUT /tasks/:key: the task's whole settings. The cron pattern is
 * checked by the API (blank: the task runs only when started).
 */
export const updateTaskBodySchema = z.strictObject({
  cron: optionalText(z.string().max(100, { error: msg("tasks.cron.invalid") })),
  timezone: requiredText(64, msg("tasks.timezone.required")),
  enabled: z.boolean(),
  timeoutSeconds: z
    .preprocess(
      (value) => (value === "" || value == null ? null : value),
      z.coerce
        .number({ error: msg("tasks.timeoutSeconds.invalid") })
        .int({ error: msg("tasks.timeoutSeconds.invalid") })
        .min(1, { error: msg("tasks.timeoutSeconds.invalid") })
        .max(TASK_TIMEOUT_MAX_SECONDS, { error: msg("tasks.timeoutSeconds.invalid") })
        .nullable(),
    )
    // Without it the key is required in z.input (preprocess takes unknown).
    .optional()
    .transform((value) => value ?? null),
});
export type UpdateTaskBodyInput = z.input<typeof updateTaskBodySchema>;
export type UpdateTaskBody = z.output<typeof updateTaskBodySchema>;

/** Query string of GET /tasks/:key/runs, newest first. */
export const listTaskRunsQuerySchema = z.strictObject({
  ...pageQuery,
  status: z.enum(TASK_RUN_STATUSES).optional(),
});
export type ListTaskRunsQuery = z.output<typeof listTaskRunsQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A user who started a run or changed a task; null if since removed. */
export interface TaskUser {
  id: string;
  name: string;
}

/** A run in GET /tasks/:key/runs. */
export interface TaskRun {
  id: number;
  taskKey: string;
  status: TaskRunStatus;
  trigger: TaskTrigger;
  triggeredBy: TaskUser | null;
  /** The app that started it, for runs started by another backend. */
  source: string | null;
  /** The error's message: a contracts message key (tasks.*) for the runner's own. */
  error: string | null;
  queuedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

/** Response of GET /tasks/:key/runs. */
export type TaskRunsList = Page<TaskRun>;

/** A line a run logged. */
export interface TaskRunLog {
  id: number;
  at: Date;
  level: TaskLogLevel;
  message: string;
  data: unknown;
}

/** Response of GET /tasks/runs/:id. */
export interface TaskRunDetail extends TaskRun {
  payload: unknown;
  result: unknown;
  errorStack: string | null;
  logs: TaskRunLog[];
}

/** A task in GET /tasks. */
export interface ListedTask {
  key: string;
  cron: string | null;
  timezone: string;
  enabled: boolean;
  timeoutSeconds: number | null;
  /** An admin changed the settings: the code's defaults no longer apply. */
  customized: boolean;
  /** The schedule the code gives it. */
  defaultCron: string | null;
  /** When its schedule runs it next; null without one. */
  nextRunAt: Date | null;
  /** Its latest run, if any. */
  lastRun: TaskRun | null;
}

/** Response of GET /tasks: every task the app defines. */
export type TasksList = ListedTask[];

/** Response of GET /tasks/:key and PUT /tasks/:key. */
export interface TaskDetail extends ListedTask {
  updatedAt: Date;
  updatedBy: TaskUser | null;
}
