/**
 * Scheduled tasks texts in English. The source of truth: it.ts must have
 * the same keys (TasksMessages), and the apps merge them under `tasks`.
 */
export const en = {
  title: "Scheduled tasks",
  description: "Jobs the app runs on a schedule, or when started. Only one run of a task at a time.",
  all: "All tasks",
  empty: "No tasks yet.",
  /** Names and descriptions, by task key (`tasks.cleanup` → tasks.cleanup). */
  names: {
    tasks: {
      cleanup: {
        name: "Clean up task runs",
        description: "Deletes old runs and fails those interrupted when the tasks app stopped.",
      },
    },
    quotations: {
      expiry: {
        name: "Quotation expiry task",
        description: "Set expired status for quotations not valid anymore."
      }
    }
  },
  fields: {
    task: "Task",
    schedule: "Schedule",
    cron: "Cron pattern",
    timezone: "Time zone",
    enabled: "On",
    timeoutSeconds: "Timeout (seconds)",
    nextRunAt: "Next run",
    lastRun: "Last run",
    defaultCron: "Default schedule",
  },
  hints: {
    cron: "minute hour day month weekday, e.g. 0 3 * * * (every day at 3:00), */15 * * * * (every 15 minutes). Blank: it runs only when started.",
    enabled: "Off: no scheduled runs, and other apps can't start it. Admins still can.",
    timeoutSeconds: "A run that takes longer fails. Blank: no limit.",
    customized: "Changed by an admin: the code's defaults no longer apply.",
  },
  manualOnly: "Only when started",
  off: "Off",
  never: "Never run",
  settings: "Settings",
  save: "Save settings",
  saved: "Settings saved.",
  reset: "Restore defaults",
  runNow: "Run now",
  runs: {
    title: "Runs",
    empty: "No runs.",
    all: "All",
    previous: "Previous",
    next: "Next",
    page: "{from}–{to} of {total}",
    run: "Run {id}",
    fields: {
      id: "Run",
      status: "Status",
      trigger: "Started by",
      queuedAt: "Queued",
      startedAt: "Started",
      finishedAt: "Finished",
      duration: "Duration",
      error: "Error",
      errorStack: "Stack trace",
      payload: "Input",
      result: "Result",
      source: "App",
    },
    logs: "Log",
    noLogs: "Nothing logged.",
  },
  status: {
    queued: "Queued",
    running: "Running",
    succeeded: "Succeeded",
    failed: "Failed",
    skipped: "Skipped",
  },
  trigger: {
    schedule: "Schedule",
    manual: "Admin",
    api: "Another app",
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
