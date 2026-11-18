import type {
  UserGroupSortField,
  UserGroupFilterField,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import { type UserGroupsMessageKey } from "./messages/index.ts";

/** Sort of the list without `?sort=`. */
export const USER_GROUPS_DEFAULT_SORT = { id: "id", desc: true };

/** A user groups table's config: its path is always set (detail links use it). */
export type UserGroupsTableConfig = DataTableConfig & { path: string };

export interface UserGroupsTableOptions {
  /** Path of the app's user groups list page, e.g. "/user-groups". */
  path: string;
}

/**
 * The user groups table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineUserGroupsTable({
  path,
}: UserGroupsTableOptions): UserGroupsTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "name",
      "description",
      "createdAt",
      "updatedAt",
    ] satisfies UserGroupSortField[],
    defaultSort: USER_GROUPS_DEFAULT_SORT,
    // { field: "…" satisfies UserGroupFilterField, label: "…" satisfies UserGroupsMessageKey }, added with the fields.
    filters: [
      {
        field: "id" satisfies UserGroupFilterField,
        label: "userGroups.fields.id" satisfies UserGroupsMessageKey,
      },
      {
        field: "name" satisfies UserGroupFilterField,
        label: "userGroups.fields.name" satisfies UserGroupsMessageKey,
      },
      {
        field: "description" satisfies UserGroupFilterField,
        label: "userGroups.fields.description" satisfies UserGroupsMessageKey,
      },
    ],
  });
  return { ...config, path };
}
