import { defineDataTable } from "./data-table";

/**
 * The customers table: plain data with no server-only imports (unlike
 * lib/customers.ts), so it's shared by the server page (reads the URL) and
 * the client table (builds links). Sort and filter fields match the
 * backend's ListCustomersQueryDto; every filter matches text the field
 * contains, and they combine with AND.
 */
export const customersTable = defineDataTable({
  path: "/customers",
  // The backend allows up to 100.
  pageSizes: [10, 20, 50],
  sortable: ["name", "email", "phone", "createdAt", "updatedAt"],
  defaultSort: { id: "name", desc: false },
  filters: [
    { field: "name", label: "Name" },
    { field: "email", label: "Email" },
    { field: "phone", label: "Phone" },
  ],
});
