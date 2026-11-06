import { CustomerType } from "@dafne/contracts";
import { CustomersMessageKey } from "./messages";

/** Labels (message keys) of the type values. */
export const CUSTOMER_TYPE_OPTIONS = [
  { value: "person", label: "customers.type.person" },
  { value: "company", label: "customers.type.company" },
] satisfies { value: CustomerType; label: CustomersMessageKey }[];
