import type * as contracts from "@backend/contracts";
import type { Json } from "@backend/contracts";
import { backendFetch } from "./backend";
import type { TableFilters, TableSort } from "./data-table";
import { activitiesTable } from "./activities-table";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedActivity = Json<contracts.ListedActivity>;
export type ActivitiesList = Json<contracts.ActivitiesList>;
export type ActivityUser = Json<contracts.ActivityUser>;
export type ActivityDetail = Json<contracts.ActivityDetail>;
export type ActivityTask = Json<contracts.ActivityTask>;

/**
 * Calls the backend's GET /activities/:id. Throws a BackendError with
 * status 404 when the activity doesn't exist or was deleted.
 */
export async function getActivity(id: string): Promise<ActivityDetail> {
  const res = await backendFetch(`/activities/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /activities (deleted activities are left out). */
export async function listActivities({
  limit,
  offset,
  filters = {},
  sort = activitiesTable.defaultSort,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<ActivitiesList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) query.set(field, value);
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/activities?${query}`);
  return res.json();
}
