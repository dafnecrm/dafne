import type {
  SalesOrderFilterField,
  SalesOrderSortField,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import type { SalesOrdersMessageKey } from "./messages/index.ts";

/** Sort of the list without `?sort=`. */
export const SALES_ORDERS_DEFAULT_SORT = { id: "createdAt", desc: false };

/** A sales orders table's config: its path is always set (detail links use it). */
export type SalesOrdersTableConfig = DataTableConfig & { path: string };

export interface SalesOrdersTableOptions {
  /** Path of the app's sales orders list page, e.g. "/sales-orders". */
  path: string;
}

/**
 * The sales orders table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineSalesOrdersTable({
  path,
}: SalesOrdersTableOptions): SalesOrdersTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: ["id", "createdAt", "updatedAt"] satisfies SalesOrderSortField[],
    defaultSort: SALES_ORDERS_DEFAULT_SORT,
    filters: [
      {
        field: "id" satisfies SalesOrderFilterField,
        label: "salesOrders.fields.id" satisfies SalesOrdersMessageKey,
      },
      {
        field: "customerId" satisfies SalesOrderFilterField,
        label: "salesOrders.fields.customerId" satisfies SalesOrdersMessageKey,
      },
      {
        field: "type" satisfies SalesOrderFilterField,
        label: "salesOrders.fields.type" satisfies SalesOrdersMessageKey,
      },
    ],
  });
  return { ...config, path };
}
