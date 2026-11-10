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
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { SalesOrderItemTable } from "./sales-order-items-table.tsx";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { SalesOrderItemSheet } from "./sales-order-item-sheet.tsx";
import type { ProductOption } from "@dafne/frontend-products/actions";

/**
 * Creates a sales order, or edits `salesOrder`. Saving opens the sales order's page
 * (`<path>/<id>`, `path` being the app's sales orders list).
 */
export function SalesOrderForm({
  salesOrder,
  path,
  types,
}: {
  salesOrder?: SalesOrderDetail;
  path: string;
  /** The sales order types' ids, the options of the type select. */
  types: string[];
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

  // The form's items hold only the product's ID: its name comes from the
  // saved items, or from the sheet's combobox for a product picked there.
  const savedProducts = useMemo(
    () =>
      new Map(salesOrder?.items.map((item) => [item.productId, item.product])),
    [salesOrder],
  );
  const [pickedProducts, setPickedProducts] = useState(
    () => new Map<number, ProductOption>(),
  );
  const productOf = (productId: number | null) =>
    productId == null
      ? undefined
      : (pickedProducts.get(productId) ?? savedProducts.get(productId));

  const [salesOrderItemSheet, setSalesOrderItemSheet] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });

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

                <form.AppField name="type">
                  {(field) => (
                    <field.SelectField
                      label={t("salesOrders.fields.type")}
                      options={types.map((type) => ({
                        value: type,
                        label: type,
                      }))}
                    />
                  )}
                </form.AppField>

                <form.AppField name="notes">
                  {(field) => (
                    <field.TextEditorField
                      label={t("salesOrders.fields.notes")}
                    />
                  )}
                </form.AppField>
              </FieldGroup>
            </CardContent>
          </Card>

          {salesOrder && (
            // Not mode="array": that re-renders only when its array version
            // changes, and reset() (on leaving the page) zeroes it, so new
            // values could be missed. The table follows every value instead.
            <form.AppField name="items">
              {(items) => (
                <>
                  <DetailSection
                    title={t("salesOrders.sections.items")}
                    groupClassName="flex"
                  >
                    <SalesOrderItemTable
                      salesOrderId={salesOrder.id}
                      items={items.state.value.map((item) => ({
                        ...item,
                        product: productOf(item.productId),
                      }))}
                      path="/sales-orders"
                      rowActions={(item, i) => (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              setSalesOrderItemSheet({
                                open: true,
                                index: i,
                              })
                            }
                          >
                            <PencilIcon />
                          </Button>
                          <Button variant="ghost" size="icon-sm">
                            <Trash2Icon />
                          </Button>
                        </>
                      )}
                    />
                  </DetailSection>
                  <SalesOrderItemSheet
                    open={salesOrderItemSheet.open}
                    takenPositions={items.state.value
                      .filter((_, i) => i !== salesOrderItemSheet.index)
                      .map((item) => item.position)}
                    item={
                      salesOrderItemSheet.index === null
                        ? null
                        : items.state.value[salesOrderItemSheet.index]
                    }
                    onOpenChange={(open) =>
                      setSalesOrderItemSheet((item) => ({ ...item, open }))
                    }
                    onSave={(item, product) => {
                      if (product) {
                        setPickedProducts((picked) =>
                          new Map(picked).set(product.id, product),
                        );
                      }
                      if (salesOrderItemSheet.index === null) {
                        items.pushValue(item);
                      } else {
                        items.replaceValue(salesOrderItemSheet.index, item);
                      }
                    }}
                  />
                </>
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
