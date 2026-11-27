/**
 * Scheduled tasks texts in English. The source of truth: it.ts must have
 * the same keys (TasksMessages), and the apps merge them under `tasks`.
 */
export const en = {
  all: "All tasks",
  description: "Jobs the app runs on a schedule, or when started. Only one run of a task at a time.",
  empty: "No tasks yet.",
  fields: {
    cron: "Cron pattern",
    defaultCron: "Default schedule",
    enabled: "On",
    lastRun: "Last run",
    nextRunAt: "Next run",
    schedule: "Schedule",
    task: "Task",
    timeoutSeconds: "Timeout (seconds)",
    timezone: "Time zone",
  },
  hints: {
    cron: "minute hour day month weekday, e.g. 0 3 * * * (every day at 3:00), */15 * * * * (every 15 minutes). Blank: it runs only when started.",
    customized: "Changed by an admin: the code's defaults no longer apply.",
    enabled: "Off: no scheduled runs, and other apps can't start it. Admins still can.",
    timeoutSeconds: "A run that takes longer fails. Blank: no limit.",
  },
  manualOnly: "Only when started",
  /** Names and descriptions, by task key (`tasks.cleanup` → tasks.cleanup). */
  names: {
    quotations: {
      expiry: {
        description: "Set expired status for quotations not valid anymore.",
        name: "Quotation expiry task"
      }
    },
    tasks: {
      cleanup: {
        description: "Deletes old runs and fails those interrupted when the tasks app stopped.",
        name: "Clean up task runs",
      },
    }
  },
  never: "Never run",
  off: "Off",
  reset: "Restore defaults",
  runNow: "Run now",
  runs: {
    all: "All",
    empty: "No runs.",
    fields: {
      duration: "Duration",
      error: "Error",
      errorStack: "Stack trace",
      finishedAt: "Finished",
      id: "Run",
      payload: "Input",
      queuedAt: "Queued",
      result: "Result",
      source: "App",
      startedAt: "Started",
      status: "Status",
      trigger: "Started by",
    },
    logs: "Log",
    next: "Next",
    noLogs: "Nothing logged.",
    page: "{from}–{to} of {total}",
    previous: "Previous",
    run: "Run {id}",
    title: "Runs",
  },
  save: "Save settings",
  saved: "Settings saved.",
  settings: "Settings",
  status: {
    failed: "Failed",
    queued: "Queued",
    running: "Running",
    skipped: "Skipped",
    succeeded: "Succeeded",
  },
  title: "Scheduled tasks",
  trigger: {
    api: "Another app",
    manual: "Admin",
    schedule: "Schedule",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type TasksMessages = Shape<typeof en>;

/** "tasks.runs.title" and the like: every key with a text. */
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];
export type TasksMessageKey = `tasks.${Paths<TasksMessages>}`;
