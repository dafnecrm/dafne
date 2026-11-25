# @dafne/backend-tasks

Scheduled tasks on BullMQ (`../../../docs/tasks.md`). The only writer of
the `tasks` schema (`@dafne/backend-database-tasks`).

- `TasksClientModule` (any backend): the queue (`sales-tasks`, Redis at
  `REDIS_URL`, prefix `dafne`), `TaskRuns` (the runs' table) and
  `TasksClient.trigger`. Needs the app's `DatabaseModule`.
- `TasksModule` (only `apps/sales-tasks`): `TasksRegistry` (the `@Task`
  providers, via `DiscoveryService`), `TasksWorker` (runs jobs, timeouts,
  logs), `TasksScheduler` (rows from code, BullMQ job schedulers, lost
  runs), `TasksService` + `TasksController` (admins), `tasks.cleanup`.
- **One run per task**: `task_run_active_idx`; a trigger meanwhile is
  recorded as `skipped` (`TaskRuns.claim`). Don't add another lock.
- The run's outcome lives in Postgres: jobs are removed when done, and
  `process` never throws. Runner errors are contracts message keys
  (`tasks.run.*`), the frontend translates them.
- Tests mock the database and the queue (`*.spec.ts`).
