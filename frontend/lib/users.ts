import { backendFetch } from "./backend";
import type { TableFilters, TableSort } from "./data-table";
import type { User } from "./session";
import { usersTable } from "./users-table";

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
