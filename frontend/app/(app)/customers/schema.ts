import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";
import type { CustomerDetail } from "@/lib/customers";

// Validation for the customer form. Limits match the backend's CustomerBodyDto.

/** Optional text: blank is fine, otherwise trimmed and at most `max` chars. */
const optional = (max: number) => z.string().trim().max(max);

const required = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: `Enter the ${label}` })
    .max(max);

export const addressSchema = z.object({
  label: optional(100),
  street: required("street", 255),
  city: required("city", 100),
  postalCode: optional(20),
  region: optional(100),
  country: required("country", 100),
});

export const customerSchema = z.object({
  name: required("name", 255),
  email: z.union([
    z.literal(""),
    z.email({ error: "Enter a valid email address" }).max(255),
  ]),
  phone: z.union([
    z.literal(""),
    // Same rule as the backend's PHONE_PATTERN.
    z.string().regex(/^\+?[0-9 ().-]{5,32}$/, {
      error: "Enter a valid phone number",
    }),
  ]),
  addresses: z.array(addressSchema).max(20),
});

export type CustomerFormValues = z.input<typeof customerSchema>;
export type AddressFormValues = CustomerFormValues["addresses"][number];

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
    } as CustomerFormValues,
  });
}
