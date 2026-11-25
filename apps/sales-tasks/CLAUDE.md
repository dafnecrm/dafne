# @dafne/sales-tasks

The sales app's scheduled tasks (see `../../docs/tasks.md`): a NestJS app
(port 3002, `https://sales-tasks.dafne.localhost` under `dafne dev`) that
runs the BullMQ worker of `@dafne/backend-tasks` (`TasksModule`), keeps
the tasks' schedules in Redis and serves the admins' API (`/tasks`,
`/task-runs/:id`), behind `SessionModule.forRoot({ app: 'sales' })`.

- **Tasks are `@Task` providers** of the modules imported in
  `SalesTasksModule`: a feature lib's task goes in its lib, and its module
  is imported here (with the lib and its runtime dependencies in this
  app's `package.json`).
- Needs Postgres (`DATABASE_URL`: the `tasks` schema and the data the
  tasks work on), Redis (`REDIS_URL`) and apps/auth (`AUTH_URL`) for the
  admins' sessions. `TASKS_CONCURRENCY`, `TASKS_RETENTION_DAYS`:
  `.env.example`.
- `app.enableShutdownHooks()` (`main.ts`): SIGTERM lets the runs in
  progress end. A run cut short is failed at the next start.
