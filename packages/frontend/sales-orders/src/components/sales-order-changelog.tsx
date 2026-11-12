"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChangelogSheet, type ChangeFieldConfig } from "@dafne/frontend-changelog/components/changelog-sheet";
import {
  EditedSummary,
  ListChangeDetails,
  nameCache,
  ResolvedName,
} from "@dafne/frontend-changelog/components/change-values";
import { getCustomerOption } from "@dafne/frontend-customers/actions";
import { getProductOption } from "@dafne/frontend-products/actions";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import { getSalesOrderChanges } from "../actions.ts";
import { getSalesOrderTypeOption } from "../sales-order-types/actions.ts";
import { SALES_ORDER_STATUS_OPTIONS } from "../sales-orders-table.ts";

/**
 * A sales order's change log, in a sheet (opened from its actions menu):
 * customers, types and products named, items' changes by position.
 */
export function SalesOrderChangelogSheet({
  salesOrderId,
  open,
  onOpenChange,
}: {
  salesOrderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("salesOrders.fields");
  const tItem = useTranslations("salesOrders.items.fields");
  const optionLabel = useOptionLabel();
  // One lookup per customer and type while the page is open.
  const [customerName] = useState(() =>
    nameCache(async (id) => (await getCustomerOption(id))?.name ?? null),
  );
  const [productName] = useState(() =>
    nameCache(async (id) => (await getProductOption(id))?.name ?? null),
  );
  const [typeName] = useState(() =>
    nameCache(async (id) => (await getSalesOrderTypeOption(id))?.description ?? null),
  );

  const fields: Record<string, ChangeFieldConfig> = {
    status: {
      label: t("status"),
      value: (value) => optionLabel(SALES_ORDER_STATUS_OPTIONS, value as string | null),
    },
    typeId: {
      label: t("type"),
      value: (value) => <ResolvedName id={value} resolve={typeName} />,
    },
    customerId: {
      label: t("customer"),
      value: (value) => <ResolvedName id={value} resolve={customerName} />,
    },
    items: {
      label: t("items"),
      summary: (change) => (
        <ListChangeDetails
          change={change}
          itemKey="position"
          itemLabel={(position) => `${tItem("position")} ${String(position)}`}
          fields={{
            productId: {
              label: tItem("productId"),
              value: (value) => <ResolvedName id={value} resolve={productName} />,
            },
            quantity: { label: tItem("quantity") },
          }}
        />
      ),
    },
    notes: {
      label: t("notes"),
      summary: (_change, operation) => <EditedSummary operation={operation} />,
    },
  };

  return (
    <ChangelogSheet
      open={open}
      onOpenChange={onOpenChange}
      load={(query) => getSalesOrderChanges(salesOrderId, query)}
      fields={fields}
    />
  );
}
