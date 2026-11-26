"use client";

import { useTranslations } from "next-intl";
import {
  ChangelogSheet,
  type ChangeFieldConfig,
} from "@dafne/frontend-changelog/components/changelog-drawer";
import type { QuotationDetail } from "../types.ts";
import { getQuotationChanges } from "../actions.ts";

/**
 * The quotation's change log, in a sheet (opened from its actions menu).
 * `fields` names the logged fields; a field's `value` or `summary` shows it
 * otherwise (e.g. a record's name for its id: ResolvedName, in
 * @dafne/frontend-changelog/components/change-values).
 */
export function QuotationChangelogSheet({
  quotationId,
  open,
  onOpenChange,
}: {
  quotationId: QuotationDetail["id"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const fields: Record<string, ChangeFieldConfig> = {
    notes: { label: t("quotations.fields.notes") },
    customerId: { label: t("quotations.fields.customerId") },
    typeId: { label: t("quotations.fields.typeId") },
    validUntil: { label: t("quotations.fields.validUntil") },
    items: { label: t("quotations.fields.items") },
    status: { label: t("quotations.fields.status") },
  };

  return (
    <ChangelogSheet
      open={open}
      onOpenChange={onOpenChange}
      load={(query) => getQuotationChanges(quotationId, query)}
      fields={fields}
    />
  );
}
