import type { OrderFilterField, OrderSortField } from "@dafne/contracts";
import { defineDataTable } from "@dafne/frontend-data-table";

/**
 * The orders table: plain data with no server-only imports (unlike
 * lib/orders.ts), so it's shared by the server page (reads the URL)
 * and the client table (builds links). Sort and filter fields are checked
 * against the backend's contract (type-only import: keeps Zod out of the
 * list page's bundle); every filter matches text the field contains, and
 * they combine with AND.
 */
export const ordersTable = defineDataTable({
  path: "/orders",
  // The backend allows up to 100.
  pageSizes: [10, 20, 50],
  sortable: ["id", "createdAt", "updatedAt"] satisfies OrderSortField[],
  defaultSort: { id: "createdAt", desc: false },
  filters: [
    { field: "id" satisfies OrderFilterField, label: "orders.fields.id" },
  ],
});
