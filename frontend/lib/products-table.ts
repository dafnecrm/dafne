import type { ProductFilterField, ProductSortField } from "@backend/contracts";
import { defineDataTable } from "./data-table";

/**
 * The products table: plain data with no server-only imports (unlike
 * lib/products.ts), so it's shared by the server page (reads the URL)
 * and the client table (builds links). Sort and filter fields are checked
 * against the backend's contract (type-only import: keeps Zod out of the
 * list page's bundle); every filter matches text the field contains, and
 * they combine with AND.
 */
export const productsTable = defineDataTable({
  path: "/products",
  // The backend allows up to 100.
  pageSizes: [10, 20, 50],
  sortable: [
    "name",
    "price",
    "createdAt",
    "updatedAt",
  ] satisfies ProductSortField[],
  defaultSort: { id: "name", desc: false },
  filters: [
    {
      field: "name" satisfies ProductFilterField,
      label: "products.fields.name",
    },
  ],
});
