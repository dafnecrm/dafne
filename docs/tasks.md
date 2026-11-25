# Scheduled tasks

`apps/sales-tasks` runs the sales app's background jobs: on a schedule
(cron), when an admin starts one, or when another backend (`apps/sales-api`)
asks. Admins see them in the frontend under **Admin › Scheduled tasks**
(`/admin/tasks`): settings, runs, logs and errors.

## Pieces

| Piece                                          | What                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `apps/sales-tasks` (port 3002)                 | The BullMQ worker, the schedules and the admins' API (`/tasks`, `/task-runs/:id`)       |
| `@dafne/backend-tasks`                         | `@Task`, `TaskHandler`, `TasksModule` (the tasks app's side), `TasksClientModule` / `TasksClient` (any backend) |
| `@dafne/backend-database-tasks` (schema `tasks`) | `task` (settings), `task_run` (runs), `task_run_log` (their log lines)                |
| `@dafne/contracts` (`tasks.ts`)                | The API's bodies, queries and responses                                               |
| `@dafne/frontend-tasks`                        | The admin pages' components, reads (`./server`, `tasksFetch`, `TASKS_URL`) and actions |
| Redis (`REDIS_URL`)                            | The queue (`dafne:sales-tasks:*`) and the cron schedules (BullMQ job schedulers)       |

## How a run goes

```
schedule (cron, in Redis) ──┐
admin: POST /tasks/:key/run ─┼─▶ task_run (queued) ─▶ queue ─▶ worker ─▶ running ─▶ succeeded | failed
sales-api: TasksClient ──────┘
```

- **One run of a task at a time.** A partial unique index,
  `task_run_active_idx` (`task_key` where `status in ('queued',
  'running')`), allows one queued or running run per task. A trigger while
  one is active is recorded as a **skipped** run: an admin gets a 409
  (`tasks.alreadyRunning`), `TasksClient.trigger` returns `skipped: true`,
  and a schedule's tick is skipped. Different tasks run in parallel, up to
  `TASKS_CONCURRENCY` (default 4) per instance.
- **The outcome is in Postgres**, not in BullMQ: the job always completes
  and is removed. What the handler returns is the run's `result` (JSON),
  what it throws its `error` and `error_stack`.
- **Timeouts**: past `timeoutSeconds` the run fails (`tasks.run.timedOut`)
  and `ctx.signal` is aborted. The handler should pass it on (fetch,
  queries) or check it: JavaScript can't stop it otherwise.
- **Lost runs**: if the app stops mid-run, the run stays `running`. At
  startup, and in the daily `tasks.cleanup`, runs older than a minute whose
  job is gone or over are failed (`tasks.run.workerLost`), so the task can
  run again. A stalled job (the worker died) is retried by BullMQ and the
  run starts over.
- **Several instances** of `apps/sales-tasks` are fine: a schedule fires
  once (Redis), and the index keeps one run per task.

## Settings and schedules

A task's settings live in `tasks.task`: `cron` (null: only when started),
`timezone`, `enabled`, `timeoutSeconds`. At startup the tasks app writes a
row for each task in code with the defaults of its `@Task`, and keeps them
in line with the code until an admin changes them (`customized`; "Restore
defaults" puts it back). Then it turns each row into a BullMQ job scheduler
(`task:<key>`), and removes those of tasks no longer in code. An admin's
change re-syncs that task's scheduler at once.

A task turned off has no scheduled runs and refuses other backends'
triggers (409 `tasks.disabled`); admins can still start it.

## Writing a task

A provider with `@Task`, implementing `TaskHandler`, in the feature lib it
belongs to:

```ts
import { Task, type TaskContext, type TaskHandler } from '@dafne/backend-tasks';

@Task({ key: 'quotations.expire', cron: '0 2 * * *', timeoutSeconds: 600 })
@Injectable()
export class ExpireQuotationsTask implements TaskHandler<{ before?: string }, { expired: number }> {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async run(ctx: TaskContext<{ before?: string }>) {
    await ctx.log.info('Expiring quotations');
    const expired = 0; // …the work, checking ctx.signal between steps
    return { expired };
  }
}
```

- **Key**: dot-separated lowercase words, unique; checked at startup with
  the cron pattern, time zone and timeout.
- **Register it** in a module that `apps/sales-tasks` imports
  (`SalesTasksModule`): the worker finds every `@Task` provider of the app.
  The app must list the lib, and its runtime dependencies.
- **Name it** in `@dafne/frontend-tasks` (`src/messages/en.ts` and
  `it.ts`, `names.<key>.name` and `.description`, `quotations.expire` →
  `names.quotations.expire`); without them the pages show the key.
- `ctx.log.debug|info|warn|error(message, data?)` writes the run's log (the
  admins see it) and the app's log. Log ids, never customer data.
- `ctx.payload` is what the trigger passed; `ctx.trigger`,
  `ctx.triggeredBy` and `ctx.source` say who started it.

## Starting a task from another backend

Import `TasksClientModule` (`apps/sales-api` does) and inject `TasksClient`:

```ts
const { runId, skipped } = await this.tasks.trigger('quotations.expire', {
  actor: session.user, // or none
  source: 'sales',
  payload: { before: '2026-01-01' },
});
```

It records the run and queues it; it doesn't wait for it. A 404 for an
unknown task (the tasks app writes the rows when it starts), a 409 for one
turned off.

## The admins' API (`apps/sales-tasks`)

Admins of the sales app (`app_access` role `admin`) or global admins, with
the session cookie (`SessionModule.forRoot({ app: 'sales' })`):

| Route                     | What                                                       |
| ------------------------- | ---------------------------------------------------------- |
| `GET /tasks`              | Every task: settings, next run, last run                   |
| `GET /tasks/:key`         | A task, plus who changed it last                           |
| `PUT /tasks/:key`         | Replaces its settings (`updateTaskBodySchema`)             |
| `POST /tasks/:key/reset`  | Back to the code's settings                                |
| `POST /tasks/:key/run`    | Starts a run now (409 when one is queued or running)       |
| `GET /tasks/:key/runs`    | Its runs, newest first (`limit`, `offset`, `status`)       |
| `GET /task-runs/:id`      | A run with its payload, result, error and log              |

The frontend calls it from the server with `tasksFetch` (`TASKS_URL`,
default `http://localhost:3002`).

## Housekeeping

`tasks.cleanup` (daily at 3:00) fails lost runs and deletes finished runs
older than `TASKS_RETENTION_DAYS` (default 30) with their logs.
