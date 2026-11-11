"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { useTranslations } from "next-intl";
import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";
import { Building2Icon, IdCardIcon, MailIcon, PencilIcon, PhoneIcon, PlusIcon, SquareUserIcon, TagIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Card, CardContent, CardHeader,
  CardTitle
} from "@dafne/frontend-ui/components/card";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError } from "@dafne/frontend-forms/client";
import { useAppForm } from "./form-hook.ts";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import type { CustomerDetail } from "../types.ts";
import { CUSTOMER_TYPE_OPTIONS } from "../customers-table.ts";
import { saveCustomer } from "../actions.ts";
import { CustomerAddressSheet } from "./customer-address-sheet.tsx";
import {
  customerFormOpts,
  customerSchema
} from "../schema.ts";
import { CustomerAddressTable } from "./customer-address-table.tsx";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";

/**
 * Creates a customer, or edits `customer`. Saving opens the customer's
 * page (`<path>/<id>`, `path` being the app's customers list); the
 * addresses are saved together with the rest.
 */
export function CustomerForm({
  customer,
  path,
}: {
  customer?: CustomerDetail;
  path: string;
}) {
  const t = useTranslations();
  const typeOptions = useOptionLabels(CUSTOMER_TYPE_OPTIONS);
  const form = useAppForm({
    ...customerFormOpts(customer),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: customerSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveCustomer(
        customer?.id ?? null,
        value,
        path,
      );
      if (result?.error) {
        setServerError(formApi, result.error);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  // The sheet that adds an address (index null) or edits addresses[index].
  // The index stays while it closes, so the content doesn't change mid-animation.
  const [addressSheet, setAddressSheet] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const cancelHref = customer
    ? `${path}/${encodeURIComponent(customer.id)}`
    : path;

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

          <DetailSection title={t("customers.sections.details")} groupVariant="grid">
            <form.AppField name="type">
              {(field) => (
                <field.SelectField
                  label={t("customers.fields.type")}
                  options={typeOptions}
                  // Chosen when the customer is created (the backend refuses a change).
                  disabled={!!customer}
                >
                  <InputGroupAddon>
                    <TagIcon />
                  </InputGroupAddon>
                </field.SelectField>
              )}
            </form.AppField>
            <form.Subscribe selector={(state) => state.values.type}>
              {(type) => (
                <>
                  <form.AppField name="name">
                    {(field) => (
                      <field.TextField
                        label={t(
                          type === "company"
                            ? "customers.fields.companyName"
                            : "customers.fields.name",
                        )}
                        autoComplete="off"
                        autoFocus
                      >
                        <InputGroupAddon>
                          <SquareUserIcon />
                        </InputGroupAddon>
                      </field.TextField>
                    )}
                  </form.AppField>
                  {/* Each type has its own fields; the other type's are cleared on save. */}
                  {type === "person" ? (
                    <>
                      <form.AppField name="birthDate">
                        {(field) => (
                          <field.DatePickerField
                            label={t("customers.fields.birthDate")}
                          />
                        )}
                      </form.AppField>
                      <form.AppField name="fiscalCode">
                        {(field) => (
                          <field.TextField
                            label={t("customers.fields.fiscalCode")}
                            autoComplete="off"
                            maxLength={16}
                            controlClassName="[&_input]:uppercase"
                          >
                            <InputGroupAddon>
                              <IdCardIcon />
                            </InputGroupAddon>
                          </field.TextField>
                        )}
                      </form.AppField>
                    </>
                  ) : (
                    <form.AppField name="vatNumber">
                      {(field) => (
                        <field.TextField
                          label={t("customers.fields.vatNumber")}
                          autoComplete="off"
                          maxLength={13}
                          controlClassName="[&_input]:uppercase"
                        >
                          <InputGroupAddon>
                            <Building2Icon />
                          </InputGroupAddon>
                        </field.TextField>
                      )}
                    </form.AppField>
                  )}
                </>
              )}
            </form.Subscribe>
          </DetailSection>

          <DetailSection title={t("customers.sections.contact")} groupVariant="grid">
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label={t("customers.fields.email")}
                  type="email"
                  autoComplete="off"
                  placeholder={t("common.emailPlaceholder")}
                >
                  <InputGroupAddon>
                    <MailIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="phone">
              {(field) => (
                <field.TextField
                  label={t("customers.fields.phone")}
                  type="tel"
                  autoComplete="off"
                  placeholder="+39 02 1234 5678"
                >
                  <InputGroupAddon>
                    <PhoneIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
          </DetailSection>

          <DetailSection
            title={t("customers.sections.addresses")}
            groupClassName="flex"
            actions={<Button
              variant="outline"
              onClick={() =>
                setAddressSheet({
                  open: true,
                  index: null,
                })
              }
            >
              <PlusIcon />
              {t("customers.addresses.add")}
            </Button>}>
            <form.AppField name="addresses">
              {(addresses) => <>
                <CustomerAddressTable
                  addresses={addresses.state.value}
                  rowActions={(address, i) => <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t(
                        "customers.addresses.editN",
                        { n: i + 1 },
                      )}
                      onClick={() =>
                        setAddressSheet({
                          open: true,
                          index: i,
                        })
                      }
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t(
                        "customers.addresses.removeN",
                        { n: i + 1 },
                      )}
                      onClick={() => addresses.removeValue(i)}
                    >
                      <Trash2Icon />
                    </Button>
                  </>}
                />
                <form.Subscribe selector={(state) => state.values.type}>
                  {(customerType) => (
                    <CustomerAddressSheet
                      open={addressSheet.open}
                      onOpenChange={(open) =>
                        setAddressSheet((sheet) => ({ ...sheet, open }))
                      }
                      customerType={customerType}
                      usedTypes={addresses.state.value
                        .filter((_, i) => i !== addressSheet.index)
                        .map((a) => a.type)}
                      address={
                        addressSheet.index === null
                          ? undefined
                          : addresses.state.value[addressSheet.index]
                      }
                      onSave={(address) =>
                        addressSheet.index === null
                          ? addresses.pushValue(address)
                          : addresses.replaceValue(
                            addressSheet.index,
                            address,
                          )
                      }
                    />
                  )}
                </form.Subscribe></>}
            </form.AppField>
          </DetailSection>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              {t("common.cancel")}
            </Button>
            <form.SubmitButton
              label={t(customer ? "common.saveChanges" : "customers.create")}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
