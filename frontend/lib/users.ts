import { backendFetch } from "./backend";
import type { User } from "./session";

/** A user as returned by the admin list (Better Auth admin plugin fields). */
export interface ListedUser extends User {
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
}

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
  search,
}: {
  limit: number;
  offset: number;
  search?: string;
}): Promise<UsersPage> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (search) query.set("search", search);
  const res = await backendFetch(`/users/list?${query}`);
  return res.json();
}
