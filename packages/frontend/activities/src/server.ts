import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { ACTIVITIES_DEFAULT_SORT } from "./activities-table";
import type { ActivitiesList, ActivityDetail } from "./types.ts";
import type { ChangesPage } from "@dafne/frontend-changelog";

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
  sort = ACTIVITIES_DEFAULT_SORT,
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
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/activities?${query}`);
  return res.json();
}

/**
 * Calls the backend's GET /activities/:id/changes (newest first). Throws
 * a BackendError with status 404 when the activity doesn't exist or was
 * deleted.
 */
export async function listActivityChanges(
  id: ActivityDetail["id"],
  { limit, offset }: { limit: number; offset: number },
): Promise<ChangesPage> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await backendFetch(
    `/activities/${encodeURIComponent(id)}/changes?${query}`,
  );
  return res.json();
}
