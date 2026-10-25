import { defineDataTable } from "./data-table";

/**
 * The users table: plain data with no server-only imports (unlike
 * lib/users.ts), so it's shared by the server page (reads the URL) and the client
 * table (builds links). Sort and filter fields match the backend's
 * ListUsersQueryDto. Filters combine with AND, and the backend picks each
 * operator: email and name match text they contain, role and banned match
 * exactly.
 */
export const usersTable = defineDataTable({
  path: "/users",
  // The backend allows up to 100.
  pageSizes: [10, 20, 50],
  sortable: ["name", "email", "role", "banned", "createdAt"],
  defaultSort: { id: "name", desc: false },
  filters: [
    { field: "email", label: "Email" },
    { field: "name", label: "Name" },
    {
      field: "role",
      label: "Role",
      placeholder: "Any role",
      options: [
        { value: "admin", label: "Admin" },
        { value: "user", label: "User" },
      ],
    },
    {
      field: "banned",
      label: "Status",
      placeholder: "Any status",
      options: [
        { value: "false", label: "Active" },
        { value: "true", label: "Banned" },
      ],
    },
  ],
});
