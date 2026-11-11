import type {
  SalesOrderTypeSortField,
  SalesOrderTypeFilterField,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import { type SalesOrderTypesMessageKey } from "./messages/index.ts";

/** Sort of the list without `?sort=`. */
export const SALES_ORDER_TYPES_DEFAULT_SORT = { id: "createdAt", desc: false };

/** A sales order types table's config: its path is always set (detail links use it). */
export type SalesOrderTypesTableConfig = DataTableConfig & { path: string };

export interface SalesOrderTypesTableOptions {
  /** Path of the app's sales order types list page, e.g. "/sales-order-types". */
  path: string;
}

/**
 * The sales order types table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineSalesOrderTypesTable({
  path,
}: SalesOrderTypesTableOptions): SalesOrderTypesTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "description",
      "active",
      "createdAt",
      "updatedAt",
    ] satisfies SalesOrderTypeSortField[],
    defaultSort: SALES_ORDER_TYPES_DEFAULT_SORT,
    // { field: "…" satisfies SalesOrderTypeFilterField, label: "…" satisfies SalesOrderTypesMessageKey }, added with the fields.
    filters: [
      {
        field: "id" satisfies SalesOrderTypeFilterField,
        label: "salesOrderTypes.fields.id" satisfies SalesOrderTypesMessageKey,
      },
      {
        field: "description" satisfies SalesOrderTypeFilterField,
        label:
          "salesOrderTypes.fields.description" satisfies SalesOrderTypesMessageKey,
      },
      {
        field: "active" satisfies SalesOrderTypeFilterField,
        label:
          "salesOrderTypes.fields.active" satisfies SalesOrderTypesMessageKey,
        options: [
          { value: "true", label: "common.yes" },
          { value: "false", label: "common.no" },
        ],
      },
    ],
  });
  return { ...config, path };
}
