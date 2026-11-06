import { CustomerAddressType, CustomerType } from "@dafne/contracts";
import { CustomersMessageKey } from "./messages";

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