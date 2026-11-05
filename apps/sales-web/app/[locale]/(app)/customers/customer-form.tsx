"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { useTranslations } from "next-intl";
import { useOptionLabel, useOptionLabels } from "@/i18n/options";
import { MapPinPlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { CountryName } from "@/components/country-select";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dafne/frontend-ui/components/card";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dafne/frontend-ui/components/table";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import type { CustomerDetail } from "@/lib/customers";
import { CUSTOMER_ADDRESS_TYPE_OPTIONS } from "@/lib/customers-table";
import { saveCustomer } from "./actions";
import { CustomerAddressSheet } from "./customer-address-sheet";
import {
  addressTypeOptions,
  customerFormOpts,
  customerSchema,
  TYPE_OPTIONS,
} from "./schema";

/**
 * Creates a customer, or edits `customer`. Saving opens the customer's
 * page; the addresses are saved together with the rest.
 */
export function CustomerForm({ customer }: { customer?: CustomerDetail }) {
  const t = useTranslations();
  const typeOptions = useOptionLabels(TYPE_OPTIONS);
  const optionLabel = useOptionLabel();
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
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  // The sheet that adds an address (index null) or edits addresses[index].
  // The index stays while it closes, so the content doesn't change mid-animation.
  const [addressSheet, setAddressSheet] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
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
                <h2>{t("customers.sections.details")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid grid-cols-2 gap-6">
                <form.AppField name="type">
                  {(field) => (
                    <field.SelectField
                      label={t("customers.fields.type")}
                      options={typeOptions}
                      // Chosen when the customer is created (the backend refuses a change).
                      disabled={!!customer}
                    />
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
                          />
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
                              />
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
                            />
                          )}
                        </form.AppField>
                      )}
                    </>
                  )}
                </form.Subscribe>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("customers.sections.contact")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid grid-cols-2 gap-6">
                <form.AppField name="email">
                  {(field) => (
                    <field.TextField
                      label={t("customers.fields.email")}
                      type="email"
                      autoComplete="off"
                      placeholder={t("common.emailPlaceholder")}
                    />
                  )}
                </form.AppField>
                <form.AppField name="phone">
                  {(field) => (
                    <field.TextField
                      label={t("customers.fields.phone")}
                      type="tel"
                      autoComplete="off"
                      placeholder="+39 02 1234 5678"
                    />
                  )}
                </form.AppField>
              </FieldGroup>
            </CardContent>
          </Card>

          {!!customer && (
            <form.AppField name="addresses" mode="array">
              {(addresses) => (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>{t("customers.sections.addresses")}</h2>
                    </CardTitle>
                    <CardDescription>
                      {addresses.state.value.length
                        ? t("customers.addresses.ordered")
                        : t("customers.addresses.none")}
                    </CardDescription>
                    <CardAction>
                      <form.Subscribe selector={(state) => state.values.type}>
                        {(customerType) => (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            // One address of each type: none left to add.
                            disabled={
                              !addressTypeOptions(
                                customerType,
                                addresses.state.value.map((a) => a.type),
                              ).length
                            }
                            onClick={() =>
                              setAddressSheet({ open: true, index: null })
                            }
                          >
                            <MapPinPlusIcon data-icon="inline-start" />
                            {t("customers.addresses.add")}
                          </Button>
                        )}
                      </form.Subscribe>
                    </CardAction>
                  </CardHeader>
                  {addresses.state.value.length > 0 && (
                    <CardContent>
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>
                                {t("customers.addresses.fields.type")}
                              </TableHead>
                              <TableHead>
                                {t("customers.addresses.fields.street")}
                              </TableHead>
                              <TableHead>
                                {t("customers.addresses.fields.postalCode")}
                              </TableHead>
                              <TableHead>
                                {t("customers.addresses.fields.city")}
                              </TableHead>
                              <TableHead>
                                {t("customers.addresses.fields.region")}
                              </TableHead>
                              <TableHead>
                                {t("customers.addresses.fields.country")}
                              </TableHead>
                              <TableHead className="w-0">
                                <span className="sr-only">
                                  {t("dataTable.actions")}
                                </span>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {addresses.state.value.map((address, i) => (
                              // TanStack Form tracks array items by index.
                              <TableRow key={i}>
                                <TableCell>
                                  {optionLabel(
                                    CUSTOMER_ADDRESS_TYPE_OPTIONS,
                                    address.type,
                                  )}
                                </TableCell>
                                <TableCell>{address.street}</TableCell>
                                <TableCell>
                                  {address.postalCode || "—"}
                                </TableCell>
                                <TableCell>{address.city}</TableCell>
                                <TableCell>{address.region || "—"}</TableCell>
                                <TableCell>
                                  <CountryName code={address.countryCode} />
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1">
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
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
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
                  </form.Subscribe>
                </Card>
              )}
            </form.AppField>
          )}

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
