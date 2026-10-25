import { backendFetch } from "./backend";
import type { TableFilters, TableSort } from "./data-table";
import type { User } from "./session";

type DateFields = "createdAt" | "updatedAt" | "banExpires";

/**
 * A user from the backend's GET /users/list: the Better Auth user (admin
 * plugin fields included), with dates still as JSON strings.
 */
export type ListedUser = Omit<User, DateFields> & {
  createdAt: string;
  updatedAt: string;
  banExpires?: string | null;
};

export interface UsersPage {
  users: ListedUser[];
  total: number;
  limit?: number;
  offset?: number;
}

/** Fields the backend can sort users by (see the backend's ListUsersQueryDto). */
export const USER_SORT_FIELDS = [
  "name",
  "email",
  "role",
  "banned",
  "createdAt",
] as const;

/**
 * Fields the backend can filter users by (see the backend's
 * ListUsersQueryDto). They combine with AND, and the backend picks each
 * operator: email and name match text they contain, role and banned match
 * exactly.
 */
export const USER_FILTER_FIELDS = ["email", "name", "role", "banned"] as const;

/** Newest first. */
export const DEFAULT_USER_SORT: TableSort = { id: "name", desc: false };

/**
 * Calls the backend's GET /users/list (admins only: other users get a
 * BackendError with status 403).
 */
export async function listUsers({
  limit,
  offset,
  filters = {},
  sort = DEFAULT_USER_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<UsersPage> {
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
