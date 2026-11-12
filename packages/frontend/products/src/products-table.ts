import type { ProductFilterField, ProductSortField } from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import type { ProductsMessageKey } from "./messages/index.ts";

/** Sort of the list without `?sort=`. */
export const PRODUCTS_DEFAULT_SORT = { id: "id", desc: true };

/** A products table's config: its path is always set (detail links use it). */
export type ProductsTableConfig = DataTableConfig & { path: string };

export interface ProductsTableOptions {
  /** Path of the app's products list page, e.g. "/products". */
  path: string;
}

/**
 * The products table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineProductsTable({
  path,
}: ProductsTableOptions): ProductsTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "name",
      "price",
      "createdAt",
      "updatedAt",
    ] satisfies ProductSortField[],
    defaultSort: PRODUCTS_DEFAULT_SORT,
    filters: [
      {
        field: "id" satisfies ProductFilterField,
        label: "products.fields.id" satisfies ProductsMessageKey,
      },
      {
        field: "name" satisfies ProductFilterField,
        label: "products.fields.name" satisfies ProductsMessageKey,
      },
    ],
  });
  return { ...config, path };
}
