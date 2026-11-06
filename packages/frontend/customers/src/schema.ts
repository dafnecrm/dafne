import { formOptions } from "@tanstack/react-form-nextjs";
import {
  customerAddressBodySchema,
  customerBodySchema,
  type CustomerType,
  type CustomerAddressBody,
  type CustomerAddressType,
  type CustomerBody,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import { CUSTOMER_ADDRESS_TYPE_OPTIONS } from "./customer-address-type-options.ts";
import type { CustomerDetail } from "./types.ts";

/**
 * Form values: every field is text, "" when blank, except the types
 * (picked from a list). Keys follow the contract.
 */
export type AddressFormValues = Record<
  Exclude<keyof CustomerAddressBody, "type">,
  string
> & { type: CustomerAddressType };
export type CustomerFormValues = Record<
  Exclude<keyof CustomerBody, "addresses" | "type">,
  string
> & {
  addresses: AddressFormValues[];
  type: CustomerType;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const customerSchema =
  formSchema<CustomerFormValues>()(customerBodySchema);

/** Validates one address, in the sheet that adds or edits it. */
export const addressSchema = formSchema<AddressFormValues>()(
  customerAddressBodySchema,
);

/**
 * The address types a `customerType` customer can still pick: the ones of
 * its type, minus those `used` by its other addresses (one of each).
 */
export function addressTypeOptions(
  customerType: CustomerType,
  used: readonly CustomerAddressType[],
) {
  return CUSTOMER_ADDRESS_TYPE_OPTIONS.filter(
    (option) =>
      option.customerType.includes(customerType) &&
      !used.includes(option.value),
  );
}

/** A new address: the first type still free (the form offers none when all are used). */
export const emptyAddress = (
  customerType: CustomerType,
  used: readonly CustomerAddressType[],
): AddressFormValues => ({
  type: (
    addressTypeOptions(customerType, used)[0] ??
    addressTypeOptions(customerType, [])[0]
  ).value,
  street: "",
  city: "",
  postalCode: "",
  region: "",
  countryCode: "",
});

/** The customer types, for the form's select (labels are message keys). */
export { CUSTOMER_TYPE_OPTIONS as TYPE_OPTIONS } from "./customer-type-options.ts";

/** Form values for a new customer, or for editing `customer`. */
export function customerFormOpts(customer?: CustomerDetail) {
  return formOptions({
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      addresses:
        customer?.addresses.map((a) => ({
          type: a.type,
          street: a.street,
          city: a.city,
          postalCode: a.postalCode ?? "",
          region: a.region ?? "",
          countryCode: a.countryCode,
        })) ?? [],
      type: customer?.type ?? "company",
      birthDate: customer?.birthDate?.slice(0, 10) ?? "",
      fiscalCode: customer?.fiscalCode ?? "",
      vatNumber: customer?.vatNumber ?? "",
    } satisfies CustomerFormValues as CustomerFormValues,
  });
}
