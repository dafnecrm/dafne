"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Can } from "@dafne/frontend-permissions";
import { Button } from "@dafne/frontend-ui/components/button";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveSalesOrder } from "../actions.ts";
import { useAppForm } from "./form-hook.ts";
import {
  salesOrderFormOpts,
  salesOrderSchema,
  STATUS_OPTIONS,
} from "../schema.ts";
import type { SalesOrderDetail } from "../types.ts";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { TagIcon } from "lucide-react";
import {
  DocumentItemsSection,
  hasOutdatedPrices,
} from "./document-items-section.tsx";
import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { useSearchParams } from "next/navigation";

/**
 * Creates a sales order, or edits `salesOrder`. Saving opens the sales order's page
 * (`<path>/<id>`, `path` being the app's sales orders list).
 */
export function SalesOrderForm({
  salesOrder,
  path,
}: {
  salesOrder?: SalesOrderDetail;
  path: string;
}) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const customerIdFromParams = searchParams.get("customerId");

  const statusOptions = useOptionLabels(STATUS_OPTIONS);

  const form = useAppForm({
    ...salesOrderFormOpts(salesOrder, { customerId: customerIdFromParams }),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: salesOrderSchema },
    // "Save changes and update prices" submits with reprice: true.
    onSubmitMeta: { reprice: false } as { reprice: boolean },
    onSubmit: async ({ value, meta, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveSalesOrder(
        salesOrder?.id ?? null,
        value,
        path,
        meta,
      );
      if (result?.error) {
        setServerError(formApi, result.error);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = salesOrder
    ? `${path}/${encodeURIComponent(salesOrder.id)}`
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

          <DetailSection
            title={t("salesOrders.sections.details")}
            groupVariant="grid"
          >
            <form.AppField name="typeId">
              {(field) => (
                <field.SalesOrderTypeSelectField
                  label={t("salesOrders.fields.type")}
                  option={salesOrder?.type}
                />
              )}
            </form.AppField>
            <form.AppField name="customerId">
              {(field) => (
                <field.CustomerSelectField
                  label={t("salesOrders.fields.customer")}
                  option={salesOrder?.customer}
                />
              )}
            </form.AppField>
            <form.AppField name="status">
              {(field) => {
                const status = (disabled: boolean) => (
                  <field.SelectField
                    label={t("salesOrders.fields.status")}
                    options={statusOptions}
                    disabled={disabled}
                  >
                    <InputGroupAddon>
                      <TagIcon />
                    </InputGroupAddon>
                  </field.SelectField>
                );
                // Changing it needs its own permission (the API checks it too).
                return (
                  <Can I="changeStatus" a="SalesOrder" fallback={status(true)}>
                    {status(false)}
                  </Can>
                );
              }}
            </form.AppField>

            <form.AppField name="notes">
              {(field) => (
                <field.TextareaField
                  label={t("salesOrders.fields.notes")}
                  className="col-span-full"
                />
              )}
            </form.AppField>
          </DetailSection>

          {/**
           * Not mode="array": that re-renders only when its array version
           * changes, and reset() (on leaving the page) zeroes it, so new
           * values could be missed. The table follows every value instead.
           */}
          <form.AppField name="items">
            {(items) => (
              <DocumentItemsSection
                items={items.state.value}
                savedItems={salesOrder?.items}
                onAdd={(item) => items.pushValue(item)}
                onReplace={(index, item) => items.replaceValue(index, item)}
                onRemove={(index) => items.removeValue(index)}
              />
            )}
          </form.AppField>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              {t("common.cancel")}
            </Button>
            {hasOutdatedPrices(salesOrder?.items) && (
              <form.SubmitButton
                variant="destructive"
                label={t("salesOrders.saveChangesAndUpdatePrices")}
                submitMeta={{ reprice: true }}
              />
            )}
            <form.SubmitButton
              label={t(
                salesOrder ? "common.saveChanges" : "salesOrders.create",
              )}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
