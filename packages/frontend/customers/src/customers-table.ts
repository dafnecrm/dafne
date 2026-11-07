import type {
  CustomerFilterField,
  CustomerSortField
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import type { CustomersMessageKey } from "./messages/index.ts";
import { CUSTOMER_TYPE_OPTIONS } from "./customer-type-options.ts";

/** Sort of the list without `?sort=`. */
export const CUSTOMERS_DEFAULT_SORT = { id: "name", desc: false };

/** A customers table's config: its path is always set (detail links use it). */
export type CustomersTableConfig = DataTableConfig & { path: string };

export interface CustomersTableOptions {
  /** Path of the app's customers list page, e.g. "/customers". */
  path: string;
}

/**
 * The customers table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineCustomersTable({
  path,
}: CustomersTableOptions): CustomersTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "type",
      "name",
      "birthDate",
      "fiscalCode",
      "vatNumber",
      "email",
      "phone",
      "createdAt",
      "updatedAt",
    ] satisfies CustomerSortField[],
    defaultSort: CUSTOMERS_DEFAULT_SORT,
    filters: [
      {
        field: "id" satisfies CustomerFilterField,
        label: "customers.fields.id" satisfies CustomersMessageKey,
      },
      {
        field: "name" satisfies CustomerFilterField,
        label: "customers.fields.name" satisfies CustomersMessageKey,
      },
      {
        field: "email" satisfies CustomerFilterField,
        label: "customers.fields.email" satisfies CustomersMessageKey,
      },
      {
        field: "type" satisfies CustomerFilterField,
        label: "customers.fields.type" satisfies CustomersMessageKey,
        options: CUSTOMER_TYPE_OPTIONS,
      },
      {
        field: "fiscalCode" satisfies CustomerFilterField,
        label: "customers.fields.fiscalCode" satisfies CustomersMessageKey,
      },
      {
        field: "vatNumber" satisfies CustomerFilterField,
        label: "customers.fields.vatNumber" satisfies CustomersMessageKey,
      },
    ],
  });
  return { ...config, path };
}
