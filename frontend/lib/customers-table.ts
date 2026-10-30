import type {
  CustomerAddressType,
  CustomerFilterField,
  CustomerSortField,
  CustomerType,
} from "@backend/contracts";
import { defineDataTable } from "./data-table";

/** Labels of an address's type, for the form and the detail page. */
export const CUSTOMER_ADDRESS_TYPE_OPTIONS = [
  { value: "head_office", label: "Head office" },
  { value: "shipping", label: "Shipping" },
  { value: "billing", label: "Billing" },
] as const satisfies readonly { value: CustomerAddressType; label: string }[];

/** Labels of the type values. */
export const CUSTOMER_TYPE_OPTIONS = [
  { value: "person", label: "Person" },
  { value: "company", label: "Company" },
] satisfies { value: CustomerType; label: string }[];

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
    { field: "name" satisfies CustomerFilterField, label: "Name" },
    { field: "email" satisfies CustomerFilterField, label: "Email" },
    { field: "phone" satisfies CustomerFilterField, label: "Phone" },
    {
      field: "type" satisfies CustomerFilterField,
      label: "Type",
      placeholder: "Any type",
      options: CUSTOMER_TYPE_OPTIONS,
    },
    { field: "fiscalCode" satisfies CustomerFilterField, label: "Fiscal code" },
    { field: "vatNumber" satisfies CustomerFilterField, label: "VAT number" },
  ],
});
