import type { UserFilterField, UserSortField } from "@dafne/contracts";
import { defineDataTable, type DataTableConfig } from "@dafne/frontend-data-table";
import type { UsersMessageKey } from "./messages/index.ts";

/** Sort of the list without `?sort=`. */
export const USERS_DEFAULT_SORT = { id: "name", desc: false };

/** A users table's config: its path is always set (detail links use it). */
export type UsersTableConfig = DataTableConfig & { path: string };

export interface UsersTableOptions {
  /** Path of the app's users list page, e.g. "/admin/users". */
  path: string;
}

/**
 * The users table: plain data with no server-only imports, so the server
 * page (reads the URL) and the client table (builds links) share it. Each
 * app calls it once at module scope with its own list path. Sort and
 * filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the bundle). Filters combine with AND, and the
 * backend picks each operator: email and name match text they contain,
 * role and banned match exactly.
 */
export function defineUsersTable({ path }: UsersTableOptions): UsersTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: ["name", "email", "role", "banned", "createdAt"] satisfies UserSortField[],
    defaultSort: USERS_DEFAULT_SORT,
    filters: [
      {
        field: "email" satisfies UserFilterField,
        label: "users.fields.email" satisfies UsersMessageKey,
      },
      {
        field: "name" satisfies UserFilterField,
        label: "users.fields.name" satisfies UsersMessageKey,
      },
      {
        field: "role" satisfies UserFilterField,
        label: "users.fields.role" satisfies UsersMessageKey,
        options: [
          { value: "admin", label: "users.role.admin" satisfies UsersMessageKey },
          { value: "user", label: "users.role.user" satisfies UsersMessageKey },
        ],
      },
      {
        field: "banned" satisfies UserFilterField,
        label: "users.fields.status" satisfies UsersMessageKey,
        options: [
          { value: "false", label: "users.status.active" satisfies UsersMessageKey },
          { value: "true", label: "users.status.banned" satisfies UsersMessageKey },
        ],
      },
    ],
  });
  return { ...config, path };
}
