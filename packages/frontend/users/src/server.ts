import { authFetch } from "@dafne/frontend-api/server";
import type { ChangesPage } from "@dafne/frontend-changelog";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import type { UserDetail, UsersList } from "./types.ts";
import { USERS_DEFAULT_SORT } from "./users-table.ts";

/*
 * Reads, for server components (authFetch forwards the browser's cookies,
 * so it only runs on the server). The users are apps/auth's.
 */

/**
 * Calls the backend's GET /users/:id (admins only). Throws a BackendError
 * with status 404 when the user doesn't exist, 403 for non-admins.
 */
export async function getUser(id: string): Promise<UserDetail> {
  const res = await authFetch(`/users/${encodeURIComponent(id)}`);
  return res.json();
}

/**
 * Calls the backend's GET /users/:id/changes (admins only, newest first).
 * Throws a BackendError with status 404 when the user doesn't exist, 403
 * for non-admins.
 */
export async function listUserChanges(
  id: string,
  { limit, offset }: { limit: number; offset: number },
): Promise<ChangesPage> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await authFetch(`/users/${encodeURIComponent(id)}/changes?${query}`);
  return res.json();
}

/**
 * Calls the backend's GET /users (admins only: other users get a
 * BackendError with status 403).
 */
export async function listUsers({
  limit,
  offset,
  filters = {},
  sort = USERS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<UsersList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await authFetch(`/users?${query}`);
  return res.json();
}
