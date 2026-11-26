"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { TagIcon } from "lucide-react";
import { Can } from "@dafne/frontend-permissions";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";
import { setServerError, useResetOnLeave } from "@dafne/frontend-forms/client";
import { useAppForm } from "../../components/form-hook.ts";
import { DocumentItemsSection, hasOutdatedPrices } from "../../components/document-items-section.tsx";
import { saveQuotation } from "../actions.ts";
import { QUOTATION_EDITABLE_STATUSES } from "../quotations-table.ts";
import { quotationFormOpts, quotationSchema, STATUS_OPTIONS } from "../schema.ts";
import type { QuotationDetail } from "../types.ts";

/**
 * Creates a quotation, or edits `quotation`. Saving opens the quotation's page
 * (`<path>/<id>`, `path` being the app's quotations list). Its items are
 * edited as a sales order's. A quotation whose status isn't in
 * QUOTATION_EDITABLE_STATUSES is only shown: every field is disabled and
 * there's nothing to save.
 */
export function QuotationForm({
  quotation,
  path,
}: {
  quotation?: QuotationDetail;
  path: string;
}) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const statusOptions = useOptionLabels(STATUS_OPTIONS);
  const form = useAppForm({
    ...quotationFormOpts(quotation, { customerId: searchParams.get("customerId") }),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: quotationSchema },
    // "Save changes and update prices" submits with reprice: true.
    onSubmitMeta: { reprice: false } as { reprice: boolean },
    onSubmit: async ({ value, meta, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveQuotation(quotation?.id ?? null, value, path, meta);
      if (result?.error) {
        setServerError(formApi, result.error);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const readOnly = !!quotation && !QUOTATION_EDITABLE_STATUSES.has(quotation.status);
  const cancelHref = quotation
    ? `${path}/${encodeURIComponent(quotation.id)}`
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
          {/* Disables every control inside (fields, items' buttons) at once. */}
          <fieldset disabled={readOnly} className="contents">
            <form.FormErrors />

            <DetailSection
              title={t("quotations.sections.details")}
              groupVariant="grid"
            >
              <form.AppField name="typeId">
                {(field) => (
                  <field.SalesOrderTypeSelectField
                    label={t("quotations.fields.typeId")}
                    option={quotation?.type}
                  />
                )}
              </form.AppField>
              <form.AppField name="customerId">
                {(field) => (
                  <field.CustomerSelectField
                    label={t("quotations.fields.customerId")}
                    option={quotation?.customer}
                  />
                )}
              </form.AppField>
              <form.AppField name="status">
                {(field) => {
                  const status = (disabled: boolean) => (
                    <field.SelectField
                      label={t("quotations.fields.status")}
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
                    <Can I="changeStatus" a="Quotation" fallback={status(true)}>
                      {status(false)}
                    </Can>
                  );
                }}
              </form.AppField>
              <form.AppField name="validUntil">
                {(field) => (
                  <field.DatePickerField
                    label={t("quotations.fields.validUntil")}
                  />
                )}
              </form.AppField>
              <form.AppField name="notes">
                {(field) => (
                  <field.TextareaField
                    label={t("quotations.fields.notes")}
                    className="col-span-full"
                  />
                )}
              </form.AppField>
            </DetailSection>

            {/* Not mode="array": see SalesOrderForm. */}
            <form.AppField name="items">
              {(items) => (
                <DocumentItemsSection
                  items={items.state.value}
                  savedItems={quotation?.items}
                  onAdd={(item) => items.pushValue(item)}
                  onReplace={(index, item) => items.replaceValue(index, item)}
                  onRemove={(index) => items.removeValue(index)}
                />
              )}
            </form.AppField>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              {t(readOnly ? "common.close" : "common.cancel")}
            </Button>
            {!readOnly && hasOutdatedPrices(quotation?.items) && (
              <form.SubmitButton
                variant="destructive"
                label={t("salesOrders.saveChangesAndUpdatePrices")}
                submitMeta={{ reprice: true }}
              />
            )}
            {!readOnly && (
              <form.SubmitButton
                label={t(quotation ? "common.saveChanges" : "quotations.create")}
              />
            )}
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
