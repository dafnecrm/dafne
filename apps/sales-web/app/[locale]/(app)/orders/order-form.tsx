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
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import type { OrderDetail } from "@/lib/orders";
import { saveOrder } from "./actions";
import { orderFormOpts, orderSchema } from "./schema";

/** Creates an order, or edits `order`. Saving opens its page. */
export function OrderForm({ order }: { order?: OrderDetail }) {
  const t = useTranslations();
  const form = useAppForm({
    ...orderFormOpts(order),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: orderSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveOrder(order?.id ?? null, value);
      if (result?.error) setServerError(formApi, result.error);
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = order
    ? `/orders/${encodeURIComponent(order.id)}`
    : "/orders";

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
                <h2>{t("orders.sections.details")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <form.AppField name="notes">
                  {(field) => (<field.TextEditorField label={t("orders.fields.notes")} />)}
                </form.AppField>
                <form.AppField name="customerId">
                  {(field) => (
                    <field.TextField
                      label={t("orders.fields.customerId")}
                      autoComplete="off"
                    />
                  )}
                </form.AppField>
              </div>
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
              label={t(order ? "common.saveChanges" : "orders.create")}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
