"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { useTranslations } from "next-intl";
import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";
import { Button } from "@dafne/frontend-ui/components/button";
import { PlaceSearch } from "@dafne/frontend-geo/components/place-search";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@dafne/frontend-ui/components/field";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@dafne/frontend-ui/components/drawer";
import { useIsMobile } from "@dafne/frontend-ui/hooks/use-mobile";
import { useAppForm } from "./form-hook.ts";
import type { GeoPlace } from "@dafne/frontend-geo";
import {
  addressSchema,
  addressTypeOptions,
  emptyAddress,
  type AddressFormValues,
} from "../schema.ts";
import type { CustomerAddressType, CustomerType } from "@dafne/contracts";

/**
 * Adds an address (no `address`) or edits one, in a drawer. Saving only
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
  const isMobile = useIsMobile();
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? "down" : "right"}
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:w-md">
        <DrawerHeader>
          <DrawerTitle>{address ? t("edit") : t("add")}</DrawerTitle>
          <DrawerDescription>{t("savedWith")}</DrawerDescription>
        </DrawerHeader>
        {/* The content unmounts when the drawer closes, so each opening starts from `address`. */}
        <AddressForm
          customerType={customerType}
          usedTypes={usedTypes}
          address={address}
          onSave={(value) => {
            onSave(value);
            onOpenChange(false);
          }}
        />
      </DrawerContent>
    </Drawer>
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
      className="flex flex-1 flex-col overflow-y-auto p-4"
      onSubmit={(e) => {
        e.preventDefault();
        // The drawer is portaled, but React still bubbles the event to the customer form.
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.AppForm>
        <FieldGroup>
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
        <DrawerFooter>
          <form.SubmitButton
            label={t(
              address ? "customers.addresses.save" : "customers.addresses.add",
            )}
          />
          <DrawerClose render={<Button type="button" variant="outline" />}>
            {t("common.cancel")}
          </DrawerClose>
        </DrawerFooter>
      </form.AppForm>
    </form>
  );
}
