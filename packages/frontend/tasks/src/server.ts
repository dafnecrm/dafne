import { tasksFetch } from "@dafne/frontend-api/server";
import type { TaskRunStatus } from "@dafne/contracts";
import type { ListedTask, TaskDetail, TaskRunDetail, TaskRunsList } from "./types.ts";

/*
 * Reads, for server components: the app's scheduled tasks
 * (apps/sales-tasks, TASKS_URL), admins only (a 403 for the others).
 */

/** Every task (GET /tasks). */
export async function listTasks(): Promise<ListedTask[]> {
  return (await tasksFetch("/tasks")).json();
}

/** A task (GET /tasks/:key); a BackendError with status 404 when there's none. */
export async function getTask(key: string): Promise<TaskDetail> {
  return (await tasksFetch(`/tasks/${encodeURIComponent(key)}`)).json();
}

/** A task's runs, newest first (GET /tasks/:key/runs). */
export async function listTaskRuns(
  key: string,
  { limit, offset, status }: { limit: number; offset: number; status?: TaskRunStatus },
): Promise<TaskRunsList> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) {
    query.set("status", status);
  }
  return (await tasksFetch(`/tasks/${encodeURIComponent(key)}/runs?${query}`)).json();
}

/** A run with its log (GET /task-runs/:id); a 404 BackendError when there's none. */
export async function getTaskRun(id: string): Promise<TaskRunDetail> {
  return (await tasksFetch(`/task-runs/${encodeURIComponent(id)}`)).json();
}
