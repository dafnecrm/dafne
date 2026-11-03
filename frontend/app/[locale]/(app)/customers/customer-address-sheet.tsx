"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { useTranslations } from "next-intl";
import { useOptionLabels } from "@/i18n/options";
import { Button } from "@/components/ui/button";
import { PlaceSearch } from "@/components/place-search";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
import type { GeoPlace } from "@/lib/geo";
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
  const t = useTranslations("customers.addresses");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{address ? t("edit") : t("add")}</SheetTitle>
          <SheetDescription>{t("savedWith")}</SheetDescription>
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
  const t = useTranslations();
  const typeOptions = useOptionLabels(
    addressTypeOptions(customerType, usedTypes),
  );
  const form = useAppForm({
    defaultValues: address ?? emptyAddress(customerType, usedTypes),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: addressSchema },
    onSubmit: ({ value }) => onSave(value),
  });

  /** Copies a found place into the address fields (blank where it has none). */
  function fillFrom(place: GeoPlace) {
    const street = [place.street, place.houseNumber].filter(Boolean).join(" ");
    form.setFieldValue("street", street);
    form.setFieldValue("postalCode", place.postalCode ?? "");
    form.setFieldValue("city", place.city ?? "");
    // In Italy the county is the province, which an address shows.
    form.setFieldValue("region", place.county ?? place.region ?? "");
    form.setFieldValue("countryCode", place.countryCode ?? "");
  }

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
                label={t("customers.addresses.fields.type")}
                options={typeOptions}
              />
            )}
          </form.AppField>
          <Field>
            <FieldLabel htmlFor="address-search">
              {t("common.search")}
            </FieldLabel>
            <PlaceSearch
              id="address-search"
              onSelect={(place) => fillFrom(place)}
            />
            <FieldDescription>
              {t("customers.addresses.searchHint")}
            </FieldDescription>
          </Field>
          <form.AppField name="street">
            {(field) => (
              <field.TextField
                label={t("customers.addresses.fields.street")}
                autoComplete="off"
              />
            )}
          </form.AppField>
          <div className="grid grid-cols-3 gap-4">
            <form.AppField name="postalCode">
              {(field) => (
                <field.TextField
                  label={t("customers.addresses.fields.postalCode")}
                  autoComplete="off"
                />
              )}
            </form.AppField>
            <form.AppField name="city">
              {(field) => (
                <field.TextField
                  label={t("customers.addresses.fields.city")}
                  autoComplete="off"
                  className="col-span-2"
                />
              )}
            </form.AppField>
          </div>
          <form.AppField name="region">
            {(field) => (
              <field.TextField
                label={t("customers.addresses.fields.region")}
                autoComplete="off"
              />
            )}
          </form.AppField>
          <form.AppField name="countryCode">
            {(field) => (
              <field.CountrySelectField
                label={t("customers.addresses.fields.country")}
              />
            )}
          </form.AppField>
        </FieldGroup>
        <SheetFooter>
          <form.SubmitButton
            label={t(
              address ? "customers.addresses.save" : "customers.addresses.add",
            )}
          />
          <SheetClose render={<Button type="button" variant="outline" />}>
            {t("common.cancel")}
          </SheetClose>
        </SheetFooter>
      </form.AppForm>
    </form>
  );
}
