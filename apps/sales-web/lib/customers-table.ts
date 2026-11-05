import type {
  CustomerAddressType,
  CustomerFilterField,
  CustomerSortField,
  CustomerType,
} from "@dafne/contracts";
import type { MessageKey } from "@dafne/frontend-ui/lib/message-key";
import { defineDataTable } from "@dafne/frontend-data-table";

/**
 * Labels (message keys) of an address's type, for the form and the detail
 * page, with the customer types each one is offered to.
 */
export const CUSTOMER_ADDRESS_TYPE_OPTIONS: readonly {
  value: CustomerAddressType;
  label: MessageKey;
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
] satisfies { value: CustomerType; label: MessageKey }[];

/**
 * The customers table: plain data with no server-only imports (unlike
 * lib/customers.ts), so it's shared by the server page (reads the URL) and
 * the client table (builds links). Sort and filter fields are checked
 * against the backend's contract (type-only import: keeps Zod out of the
 * list page's bundle); every filter matches text the field
 * contains, and they combine with AND.
 */
export const customersTable = defineDataTable({
  path: "/customers",
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
  defaultSort: { id: "name", desc: false },
  filters: [
    {
      field: "name" satisfies CustomerFilterField,
      label: "customers.fields.name",
    },
    {
      field: "email" satisfies CustomerFilterField,
      label: "customers.fields.email",
    },
    {
      field: "phone" satisfies CustomerFilterField,
      label: "customers.fields.phone",
    },
    {
      field: "type" satisfies CustomerFilterField,
      label: "customers.fields.type",
      options: CUSTOMER_TYPE_OPTIONS,
    },
    {
      field: "fiscalCode" satisfies CustomerFilterField,
      label: "customers.fields.fiscalCode",
    },
    {
      field: "vatNumber" satisfies CustomerFilterField,
      label: "customers.fields.vatNumber",
    },
    { field: "id" satisfies CustomerFilterField, label: "customers.fields.id" },
  ],
});
