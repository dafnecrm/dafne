import type { UserFilterField, UserSortField } from "@dafne/contracts";
import { defineDataTable } from "@dafne/frontend-data-table";

/**
 * The users table: plain data with no server-only imports (unlike
 * lib/users.ts), so it's shared by the server page (reads the URL) and the client
 * table (builds links). Sort and filter fields are checked against the
 * backend's contract (type-only import: keeps Zod out of the bundle). Filters combine with AND, and the backend picks each
 * operator: email and name match text they contain, role and banned match
 * exactly.
 */
export const usersTable = defineDataTable({
  path: "/users",
  // The backend allows up to 100.
  pageSizes: [10, 20, 50],
  sortable: [
    "name",
    "email",
    "role",
    "banned",
    "createdAt",
  ] satisfies UserSortField[],
  defaultSort: { id: "name", desc: false },
  filters: [
    { field: "email" satisfies UserFilterField, label: "users.fields.email" },
    { field: "name" satisfies UserFilterField, label: "users.fields.name" },
    {
      field: "role" satisfies UserFilterField,
      label: "users.fields.role",
      options: [
        { value: "admin", label: "users.role.admin" },
        { value: "user", label: "users.role.user" },
      ],
    },
    {
      field: "banned" satisfies UserFilterField,
      label: "users.fields.status",
      options: [
        { value: "false", label: "users.status.active" },
        { value: "true", label: "users.status.banned" },
      ],
    },
  ],
});
