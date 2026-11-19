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
import { salesOrderFormOpts, salesOrderSchema, STATUS_OPTIONS } from "../schema.ts";
import type { SalesOrderDetail } from "../types.ts";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { SalesOrderItemTable } from "./sales-order-items-table.tsx";
import { EllipsisVerticalIcon, PencilIcon, TagIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { SalesOrderItemSheet, type SalesOrderItemUnit } from "./sales-order-item-sheet.tsx";
import type { ProductOption } from "@dafne/frontend-products/actions";
import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { useSearchParams } from "next/navigation";
import { multiplyDecimal } from "@dafne/contracts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@dafne/frontend-ui/components/dropdown-menu";


/**
 * Creates a sales order, or edits `salesOrder`. Saving opens the sales order's page
 * (`<path>/<id>`, `path` being the app's sales orders list).
 */
export function SalesOrderForm({
  salesOrder,
  path
}: {
  salesOrder?: SalesOrderDetail;
  path: string;
}) {
  const t = useTranslations();
  const searchParams = useSearchParams()
  const customerIdFromParams = searchParams.get('customerId');

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
      const result = await saveSalesOrder(salesOrder?.id ?? null, value, path, meta);
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
  const savedProduct = (productId: number | null) =>
    productId == null ? undefined : savedProducts.get(productId);
  const productOf = (productId: number | null) =>
    productId == null
      ? undefined
      : (pickedProducts.get(productId) ?? savedProducts.get(productId));

  // The factors of the items' units, by product and unit, so the table can
  // show the base quantity: from the saved items, then from the sheet.
  const unitKey = (productId: number | null, uomId: string) => `${productId}:${uomId}`;
  const savedUnits = useMemo(
    () =>
      new Map(
        salesOrder?.items.map((item) => [
          unitKey(item.productId, item.uomId),
          {
            uomId: item.uomId,
            factor: item.baseQuantity / item.quantity,
            baseUomId: item.product.uom.id,
          } satisfies SalesOrderItemUnit,
        ]),
      ),
    [salesOrder],
  );
  const [pickedUnits, setPickedUnits] = useState(
    () => new Map<string, SalesOrderItemUnit>(),
  );
  const unitOf = (productId: number | null, uomId: string) => {
    const key = unitKey(productId, uomId);
    return pickedUnits.get(key) ?? savedUnits.get(key);
  };

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

          <DetailSection title={t("salesOrders.sections.details")} groupVariant="grid">
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
                <field.TextEditorField
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
              <>
                <DetailSection
                  title={t("salesOrders.sections.items")}
                  groupClassName="flex"
                  actions={<Button
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      setSalesOrderItemSheet({
                        open: true,
                        index: null,
                      })
                    }
                  >
                    {t("salesOrders.items.add")}
                  </Button>}
                >
                  <SalesOrderItemTable
                    items={items.state.value.map((item) => {
                      const unit = unitOf(item.productId, item.uomId);
                      const baseQuantity =
                        unit && item.quantity != null
                          ? Math.round(item.quantity * unit.factor * 1e6) / 1e6
                          : undefined;
                      // As the backend does: an item saved as it is keeps its price.
                      const saved = salesOrder?.items.find(
                        (old) =>
                          old.position === item.position &&
                          old.productId === item.productId &&
                          old.uomId === item.uomId &&
                          old.quantity === item.quantity,
                      );
                      const picked = pickedUnits.get(unitKey(item.productId, item.uomId));
                      return {
                        ...item,
                        product: productOf(item.productId),
                        baseQuantity,
                        baseUomId: unit?.baseUomId,
                        basePrice: picked?.basePrice ?? savedProduct(item.productId)?.price,
                        price:
                          saved?.price ??
                          (picked?.basePrice != null && baseQuantity != null
                            ? multiplyDecimal(picked.basePrice, baseQuantity, 2)
                            : undefined),
                      };
                    })}
                    rowActions={(item, i) => (
                      <>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("common.actionsFor", {
                                name: `${t("salesOrders.items.singular")} ${item.position}`,
                              })}
                            />
                          }>
                            <EllipsisVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() =>
                              setSalesOrderItemSheet({
                                open: true,
                                index: i,
                              })
                            }>
                              <PencilIcon />
                              {t("salesOrders.items.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => items.removeValue(i)}>
                              <Trash2Icon />
                              {t("salesOrders.items.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                  product={
                    salesOrderItemSheet.index === null
                      ? undefined
                      : productOf(
                        items.state.value[salesOrderItemSheet.index]
                          .productId,
                      )
                  }
                  onOpenChange={(open) =>
                    setSalesOrderItemSheet((item) => ({ ...item, open }))
                  }
                  onSave={(item, product, unit) => {
                    if (product) {
                      setPickedProducts((picked) =>
                        new Map(picked).set(product.id, product),
                      );
                    }
                    if (unit) {
                      setPickedUnits((picked) =>
                        new Map(picked).set(unitKey(item.productId, unit.uomId), unit),
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

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              {t("common.cancel")}
            </Button>
            {salesOrder?.items.some(item => item.product.price != null &&
              item.baseQuantity != null &&
              multiplyDecimal(item.product.price, item.baseQuantity, 2) !== item.price) && <form.SubmitButton
                variant="destructive"
                label={t("salesOrders.saveChangesAndUpdatePrices")}
                submitMeta={{ reprice: true }}
              />}
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