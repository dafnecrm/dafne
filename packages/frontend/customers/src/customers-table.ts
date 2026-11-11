import type {
  CustomerAddressType,
  CustomerFilterField,
  CustomerSortField,
  CustomerType,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import type { CustomersMessageKey } from "./messages/index.ts";

/**
 * Labels (message keys) of an address's type, for the form and the detail
 * page, with the customer types each one is offered to.
 */
export const CUSTOMER_ADDRESS_TYPE_OPTIONS: readonly {
  value: CustomerAddressType;
  label: CustomersMessageKey;
  customerType: readonly CustomerType[];
}[] = [
  {
    value: "residence",
    label: "customers.addressType.residence",
    customerType: ["person"],
  },
  {
    value: "domicile",
    label: "customers.addressType.domicile",
    customerType: ["person"],
  },
  {
    value: "head_office",
    label: "customers.addressType.head_office",
    customerType: ["company"],
  },
  {
    value: "shipping",
    label: "customers.addressType.shipping",
    customerType: ["company"],
  },
  {
    value: "billing",
    label: "customers.addressType.billing",
    customerType: ["company"],
  },
];

/** Labels (message keys) of the type values. */
export const CUSTOMER_TYPE_OPTIONS = [
  { value: "person", label: "customers.type.person" },
  { value: "company", label: "customers.type.company" },
] satisfies { value: CustomerType; label: CustomersMessageKey }[];

/** Sort of the list without `?sort=`. */
export const CUSTOMERS_DEFAULT_SORT = { id: "id", desc: true };

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
      "id",
      "type",
      "name",
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
        field: "type" satisfies CustomerFilterField,
        label: "customers.fields.type" satisfies CustomersMessageKey,
        options: CUSTOMER_TYPE_OPTIONS,
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
        field: "phone" satisfies CustomerFilterField,
        label: "customers.fields.phone" satisfies CustomersMessageKey,
      },
    ],
  });
  return { ...config, path };
}
