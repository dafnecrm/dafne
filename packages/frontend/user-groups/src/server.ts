import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { USER_GROUPS_DEFAULT_SORT } from "./user-groups-table.ts";
import type { UserGroupDetail, UserGroupsList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /user-groups/:id. Throws a BackendError with
 * status 404 when the user group doesn't exist or was deleted.
 */
export async function getUserGroup(id: string): Promise<UserGroupDetail> {
  const res = await backendFetch(`/user-groups/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /user-groups (deleted user groups are left out). */
export async function listUserGroups({
  limit,
  offset,
  filters = {},
  sort = USER_GROUPS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<UserGroupsList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/user-groups?${query}`);
  return res.json();
}
