import { authFetch, backendFetch } from "@dafne/frontend-api/server";
import type { GroupPermissions, Json } from "@dafne/contracts";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { USER_GROUPS_DEFAULT_SORT } from "./user-groups-table.ts";
import type { MyUserGroup, UserGroupDetail, UserGroupsList } from "./types.ts";

/*
 * Reads, for server components (authFetch and backendFetch forward the
 * browser's cookies, so they only run on the server). The groups are
 * apps/auth's, shared by every app; their permissions are this app's.
 */

/**
 * A group (apps/auth's GET /user-groups/:id) with its permissions in this
 * app (the API's GET /user-groups/:id/permissions). Throws a BackendError
 * with status 404 when the user group doesn't exist or was deleted.
 */
export async function getUserGroup(id: string): Promise<UserGroupDetail> {
  const path = `/user-groups/${encodeURIComponent(id)}`;
  const [group, granted] = await Promise.all([
    authFetch(path).then((res) => res.json() as Promise<Omit<UserGroupDetail, "permissions">>),
    backendFetch(`${path}/permissions`).then((res) => res.json() as Promise<Json<GroupPermissions>>),
  ]);
  return { ...group, permissions: granted.permissions };
}

/**
 * The signed-in user's groups, by name (apps/auth's GET /me/user-groups):
 * for any user, not only admins. All-users groups are left out.
 */
export async function getMyUserGroups(): Promise<MyUserGroup[]> {
  const res = await authFetch("/me/user-groups");
  return res.json();
}

/** Calls apps/auth's GET /user-groups (deleted user groups are left out). */
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
  const res = await authFetch(`/user-groups?${query}`);
  return res.json();
}
