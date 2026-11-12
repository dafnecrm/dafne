"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dafne/frontend-ui/components/card";
import { FieldDescription, FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveSalesOrderType } from "../actions.ts";
import { salesOrderTypeFormOpts, salesOrderTypeSchema } from "../schema.ts";
import type { SalesOrderTypeDetail } from "../types.ts";
import { CircleAlertIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dafne/frontend-ui/components/tooltip";
import { DetailSection } from "@dafne/frontend-ui/components/detail";

/**
 * Creates a sales order type, or edits `salesOrderType`. Saving opens the sales order type's page
 * (`<path>/<id>`, `path` being the app's sales order types list).
 */
export function SalesOrderTypeForm({
  salesOrderType,
  path,
}: {
  salesOrderType?: SalesOrderTypeDetail;
  path: string;
}) {
  const t = useTranslations();
  const form = useAppForm({
    ...salesOrderTypeFormOpts(salesOrderType),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: salesOrderTypeSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveSalesOrderType(
        salesOrderType?.id ?? null,
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
  const cancelHref = salesOrderType
    ? `${path}/${encodeURIComponent(salesOrderType.id)}`
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
            title={t("salesOrderTypes.sections.details")}
            groupVariant="grid"
            actions={<form.AppField name="active">
              {(field) => (
                <Tooltip>
                  <TooltipTrigger>
                    <field.SwitchField
                      aria-label={field.state.value
                        ? t("salesOrderTypes.fields.active")
                        : t("salesOrderTypes.fields.inactive")}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {field.state.value
                      ? t("salesOrderTypes.fields.active")
                      : t("salesOrderTypes.fields.inactive")}
                  </TooltipContent>
                </Tooltip>
              )}
            </form.AppField>}>
            <form.AppField name="id">
              {(field) => (
                <field.TextField
                  label={t("salesOrderTypes.fields.id")}
                  autoComplete="off"
                />
              )}
            </form.AppField>
            <form.AppField name="description">
              {(field) => (
                <field.TextField
                  label={t("salesOrderTypes.fields.description")}
                  autoComplete="off"
                />
              )}
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
              label={t(
                salesOrderType
                  ? "common.saveChanges"
                  : "salesOrderTypes.create",
              )}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
