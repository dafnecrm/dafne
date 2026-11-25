# @dafne/backend-database-tasks

The `tasks` schema: the scheduled tasks of `apps/sales-tasks`, written only
through `@dafne/backend-tasks`.

- `tasks.task`: a task's settings (cron, time zone, enabled, timeout), one
  row per task defined in code, written with the code's defaults until an
  admin changes them (`customized`);
- `tasks.task_run`: its runs (status, trigger, who or what started it,
  result, error). The partial unique index `task_run_active_idx` keeps at
  most one queued or running run per task;
- `tasks.task_run_log`: the lines a run logged.

```sh
pnpm dafne db generate @dafne/backend-database-tasks --name <name>
```
