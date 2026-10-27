import { formOptions } from "@tanstack/react-form-nextjs";
import {
  customerBodySchema,
  type CustomerAddressBody,
  type CustomerBody,
} from "@backend/contracts";
import { formSchema } from "@/lib/app-form/form-schema";
import type { CustomerDetail } from "@/lib/customers";

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type AddressFormValues = Record<keyof CustomerAddressBody, string>;
export type CustomerFormValues = Record<
  Exclude<keyof CustomerBody, "addresses">,
  string
> & { addresses: AddressFormValues[] };

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const customerSchema =
  formSchema<CustomerFormValues>()(customerBodySchema);

export const emptyAddress: AddressFormValues = {
  label: "",
  street: "",
  city: "",
  postalCode: "",
  region: "",
  country: "",
};

/** Form values for a new customer, or for editing `customer`. */
export function customerFormOpts(customer?: CustomerDetail) {
  return formOptions({
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      addresses:
        customer?.addresses.map((a) => ({
          label: a.label ?? "",
          street: a.street,
          city: a.city,
          postalCode: a.postalCode ?? "",
          region: a.region ?? "",
          country: a.country,
        })) ?? [],
    } satisfies CustomerFormValues as CustomerFormValues,
  });
}
