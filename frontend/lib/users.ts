import type * as contracts from "@backend/contracts";
import type { Json } from "@backend/contracts";
import { backendFetch } from "./backend";
import type { TableFilters, TableSort } from "./data-table";
import { usersTable } from "./users-table";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedUser = Json<contracts.ListedUser>;
export type UsersList = Json<contracts.UsersList>;
export type UserAccount = Json<contracts.UserAccount>;
export type UserSession = Json<contracts.UserActiveSession>;
export type UserDetail = Json<contracts.UserDetail>;

/**
 * Calls the backend's GET /users/:id (admins only). Throws a BackendError
 * with status 404 when the user doesn't exist, 403 for non-admins.
 */
export async function getUser(id: string): Promise<UserDetail> {
  const res = await backendFetch(`/users/${encodeURIComponent(id)}`);
  return res.json();
}

/**
 * Calls the backend's GET /users/list (admins only: other users get a
 * BackendError with status 403).
 */
export async function listUsers({
  limit,
  offset,
  filters = {},
  sort = usersTable.defaultSort,
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
  for (const [field, value] of Object.entries(filters)) query.set(field, value);
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/users/list?${query}`);
  return res.json();
}
