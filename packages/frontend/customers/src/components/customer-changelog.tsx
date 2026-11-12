"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  ChangelogSheet,
  type ChangeFieldConfig,
} from "@dafne/frontend-changelog/components/changelog-sheet";
import { ListChangeDetails } from "@dafne/frontend-changelog/components/change-values";
import { countryName } from "@dafne/frontend-ui/lib/country-name";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import type { CustomerDetail } from "../types.ts";
import { getCustomerChanges } from "../actions.ts";
import {
  CUSTOMER_ADDRESS_TYPE_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
} from "../customers-table.ts";

/**
 * The customer's change log, in a sheet (opened from its actions menu):
 * types by their label, addresses' changes by type (one per customer).
 */
export function CustomerChangelogSheet({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: CustomerDetail["id"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const optionLabel = useOptionLabel();
  const fields: Record<string, ChangeFieldConfig> = {
    name: { label: t("customers.fields.name") },
    type: {
      label: t("customers.fields.type"),
      value: (value) => optionLabel(CUSTOMER_TYPE_OPTIONS, value as string | null),
    },
    addresses: {
      label: t("customers.fields.addresses"),
      summary: (change) => (
        <ListChangeDetails
          change={change}
          itemKey="type"
          itemLabel={(type) => optionLabel(CUSTOMER_ADDRESS_TYPE_OPTIONS, type as string)}
          fields={{
            street: { label: t("customers.addresses.fields.street") },
            postalCode: { label: t("customers.addresses.fields.postalCode") },
            city: { label: t("customers.addresses.fields.city") },
            countryCode: {
              label: t("customers.addresses.fields.country"),
              value: (code) => (typeof code === "string" ? countryName(code, locale, code) : "—"),
            },
          }}
        />
      ),
    },
    email: { label: t("customers.fields.email") },
    phone: { label: t("customers.fields.phone") },
  };

  return (
    <ChangelogSheet
      open={open}
      onOpenChange={onOpenChange}
      load={(query) => getCustomerChanges(customerId, query)}
      fields={fields}
    />
  );
}
