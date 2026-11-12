"use client";

import { useTranslations } from "next-intl";
import {
  ChangelogSheet,
  type ChangeFieldConfig,
} from "@dafne/frontend-changelog/components/changelog-sheet";
import type { ProductDetail } from "../types.ts";
import { getProductChanges } from "../actions.ts";

/**
 * The product's change log, in a sheet (opened from its actions menu).
 * `fields` names the logged fields; a field's `value` or `summary` shows it
 * otherwise (e.g. a record's name for its id: ResolvedName, in
 * @dafne/frontend-changelog/components/change-values).
 */
export function ProductChangelogSheet({
  productId,
  open,
  onOpenChange,
}: {
  productId: ProductDetail["id"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const fields: Record<string, ChangeFieldConfig> = {
    name: { label: t("products.fields.name") },
    description: { label: t("products.fields.description") },
    price: { label: t("products.fields.price") },
  };

  return (
    <ChangelogSheet
      open={open}
      onOpenChange={onOpenChange}
      load={(query) => getProductChanges(productId, query)}
      fields={fields}
    />
  );
}
