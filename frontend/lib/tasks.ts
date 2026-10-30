import type * as contracts from "@backend/contracts";
import type { Json } from "@backend/contracts";
import { backendFetch } from "./backend";
import type { TableFilters, TableSort } from "./data-table";
import { tasksTable } from "./tasks-table";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedTask = Json<contracts.ListedTask>;
export type TasksList = Json<contracts.TasksList>;
export type TaskUser = Json<contracts.TaskUser>;
export type TaskDetail = Json<contracts.TaskDetail>;

/**
 * Calls the backend's GET /tasks/:id. Throws a BackendError with
 * status 404 when the task doesn't exist or was deleted.
 */
export async function getTask(id: string): Promise<TaskDetail> {
  const res = await backendFetch(`/tasks/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /tasks (deleted tasks are left out). */
export async function listTasks({
  limit,
  offset,
  filters = {},
  sort = tasksTable.defaultSort,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<TasksList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) query.set(field, value);
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/tasks?${query}`);
  return res.json();
}
