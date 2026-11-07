"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dafne/frontend-ui/components/card";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveSalesOrder } from "../actions.ts";
import { useAppForm } from "./form-hook.ts";
import { salesOrderFormOpts, salesOrderSchema } from "../schema.ts";
import type { SalesOrderDetail } from "../types.ts";

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
  const form = useAppForm({
    ...salesOrderFormOpts(salesOrder),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: salesOrderSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveSalesOrder(salesOrder?.id ?? null, value, path);
      if (result?.error) setServerError(formApi, result.error);
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
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("salesOrders.sections.details")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="flex flex-col gap-6">
                <form.AppField name="customerId">
                  {(field) => (
                    <field.CustomerSelectField
                      label={t("salesOrders.fields.customer")}
                    />
                  )}
                </form.AppField>
          
                <form.AppField name="notes">
                  {(field) => (<field.TextEditorField label={t("salesOrders.fields.notes")} />)}
                </form.AppField>
              </FieldGroup>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              {t("common.cancel")}
            </Button>
            <form.SubmitButton
              label={t(salesOrder ? "common.saveChanges" : "salesOrders.create")}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
