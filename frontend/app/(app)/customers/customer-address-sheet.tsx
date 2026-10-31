"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppForm } from "@/lib/app-form/app-form";
import {
  addressSchema,
  addressTypeOptions,
  emptyAddress,
  type AddressFormValues,
} from "./schema";
import type { CustomerAddressType, CustomerType } from "@backend/contracts";

/**
 * Adds an address (no `address`) or edits one, in a sheet. Saving only
 * changes the customer form: the address is stored when the customer is.
 */
export function CustomerAddressSheet({
  open,
  onOpenChange,
  customerType,
  usedTypes,
  address,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The type chosen in the customer form: it decides the address types offered. */
  customerType: CustomerType;
  /** The types of the customer's other addresses: not offered (one of each). */
  usedTypes: CustomerAddressType[];
  address?: AddressFormValues;
  onSave: (address: AddressFormValues) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{address ? "Edit address" : "Add address"}</SheetTitle>
          <SheetDescription>Saved together with the customer.</SheetDescription>
        </SheetHeader>
        {/* The content unmounts when the sheet closes, so each opening starts from `address`. */}
        <AddressForm
          customerType={customerType}
          usedTypes={usedTypes}
          address={address}
          onSave={(value) => {
            onSave(value);
            onOpenChange(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function AddressForm({
  customerType,
  usedTypes,
  address,
  onSave,
}: {
  /** The type chosen in the customer form: it decides the address types offered. */
  customerType: CustomerType;
  /** The types of the customer's other addresses: not offered (one of each). */
  usedTypes: CustomerAddressType[];
  address?: AddressFormValues;
  onSave: (address: AddressFormValues) => void;
}) {
  const form = useAppForm({
    defaultValues: address ?? emptyAddress(customerType, usedTypes),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: addressSchema },
    onSubmit: ({ value }) => onSave(value),
  });

  return (
    <form
      noValidate
      className="flex flex-1 flex-col overflow-y-auto"
      onSubmit={(e) => {
        e.preventDefault();
        // The sheet is portaled, but React still bubbles the event to the customer form.
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.AppForm>
        <FieldGroup className="px-4">
          <form.AppField name="type">
            {(field) => (
              <field.SelectField
                label="Type"
                options={addressTypeOptions(customerType, usedTypes)}
              />
            )}
          </form.AppField>
          <form.AppField name="street">
            {(field) => (
              <field.TextField label="Street" autoComplete="off" autoFocus />
            )}
          </form.AppField>
          <div className="grid grid-cols-3 gap-4">
            <form.AppField name="postalCode">
              {(field) => (
                <field.TextField label="Postal code" autoComplete="off" />
              )}
            </form.AppField>
            <form.AppField name="city">
              {(field) => (
                <field.TextField
                  label="City"
                  autoComplete="off"
                  className="col-span-2"
                />
              )}
            </form.AppField>
          </div>
          <form.AppField name="region">
            {(field) => (
              <field.TextField label="State / province" autoComplete="off" />
            )}
          </form.AppField>
          <form.AppField name="country">
            {(field) => <field.TextField label="Country" autoComplete="off" />}
          </form.AppField>
        </FieldGroup>
        <SheetFooter>
          <form.SubmitButton label={address ? "Save address" : "Add address"} />
          <SheetClose render={<Button type="button" variant="outline" />}>
            Cancel
          </SheetClose>
        </SheetFooter>
      </form.AppForm>
    </form>
  );
}
