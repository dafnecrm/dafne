"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { MapPinPlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import type { CustomerDetail } from "@/lib/customers";
import { saveCustomer } from "./actions";
import { customerFormOpts, customerSchema, emptyAddress } from "./schema";

/**
 * Creates a customer, or edits `customer`. Saving opens the customer's
 * page; the addresses are saved together with the rest.
 */
export function CustomerForm({ customer }: { customer?: CustomerDetail }) {
  const form = useAppForm({
    ...customerFormOpts(customer),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: customerSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveCustomer(customer?.id ?? null, value);
      if (result?.error) setServerError(formApi, result.error);
    },
  });
  const cancelHref = customer
    ? `/customers/${encodeURIComponent(customer.id)}`
    : "/customers";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.AppForm>
        <FieldGroup>
          <form.FormErrors />

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Details</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <form.AppField name="name">
                  {(field) => (
                    <field.TextField label="Name" autoComplete="off" autoFocus />
                  )}
                </form.AppField>
                <form.AppField name="email">
                  {(field) => (
                    <field.TextField
                      label="Email (optional)"
                      type="email"
                      autoComplete="off"
                      placeholder="name@example.com"
                    />
                  )}
                </form.AppField>
                <form.AppField name="phone">
                  {(field) => (
                    <field.TextField
                      label="Phone (optional)"
                      type="tel"
                      autoComplete="off"
                      placeholder="+39 02 1234 5678"
                    />
                  )}
                </form.AppField>
              </div>
            </CardContent>
          </Card>

          <form.AppField name="addresses" mode="array">
            {(addresses) => (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>Addresses</h2>
                  </CardTitle>
                  <CardDescription>
                    {addresses.state.value.length
                      ? "In the order they're shown on the customer's page."
                      : "No addresses yet."}
                  </CardDescription>
                  <CardAction>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addresses.pushValue({ ...emptyAddress })}
                    >
                      <MapPinPlusIcon data-icon="inline-start" />
                      Add address
                    </Button>
                  </CardAction>
                </CardHeader>
                {addresses.state.value.length > 0 && (
                  <CardContent className="flex flex-col gap-6">
                    {addresses.state.value.map((_, i) => (
                      // TanStack Form tracks array items by index.
                      <fieldset
                        key={i}
                        className="flex flex-col gap-4 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <legend className="font-medium">
                            Address {i + 1}
                          </legend>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addresses.removeValue(i)}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                          <form.AppField name={`addresses[${i}].label`}>
                            {(field) => (
                              <field.TextField
                                label="Label (optional)"
                                placeholder="Billing, Shipping…"
                                className="md:col-span-2"
                              />
                            )}
                          </form.AppField>
                          <form.AppField name={`addresses[${i}].street`}>
                            {(field) => (
                              <field.TextField
                                label="Street"
                                autoComplete="off"
                                className="md:col-span-4"
                              />
                            )}
                          </form.AppField>
                          <form.AppField name={`addresses[${i}].postalCode`}>
                            {(field) => (
                              <field.TextField
                                label="Postal code (optional)"
                                autoComplete="off"
                                className="md:col-span-2"
                              />
                            )}
                          </form.AppField>
                          <form.AppField name={`addresses[${i}].city`}>
                            {(field) => (
                              <field.TextField
                                label="City"
                                autoComplete="off"
                                className="md:col-span-4"
                              />
                            )}
                          </form.AppField>
                          <form.AppField name={`addresses[${i}].region`}>
                            {(field) => (
                              <field.TextField
                                label="State / province (optional)"
                                autoComplete="off"
                                className="md:col-span-3"
                              />
                            )}
                          </form.AppField>
                          <form.AppField name={`addresses[${i}].country`}>
                            {(field) => (
                              <field.TextField
                                label="Country"
                                autoComplete="off"
                                className="md:col-span-3"
                              />
                            )}
                          </form.AppField>
                        </div>
                      </fieldset>
                    ))}
                  </CardContent>
                )}
              </Card>
            )}
          </form.AppField>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              Cancel
            </Button>
            <form.SubmitButton
              label={customer ? "Save changes" : "Create customer"}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
