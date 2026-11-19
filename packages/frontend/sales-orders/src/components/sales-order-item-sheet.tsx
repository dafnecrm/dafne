"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { multiplyDecimal } from "@dafne/contracts";
import { formatCurrency } from "@dafne/frontend-ui/lib/currencies";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@dafne/frontend-ui/components/sheet";
import {
  salesOrderItem,
  salesOrderItemSchema,
  type SalesOrderItemFormValues,
} from "../schema.ts";
import { useAppForm } from "./form-hook.ts";
import { revalidateLogic, useStore } from "@tanstack/react-form-nextjs";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  getProductSaleUnits,
  type ProductOption,
} from "@dafne/frontend-products/actions";
import type { ProductSaleUnit } from "@dafne/frontend-products";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { RulerIcon } from "lucide-react";

/**
 * An item's unit as the order's table shows it: the unit, how many of the
 * product's base unit one of it is, and the base unit.
 */
export interface SalesOrderItemUnit {
  uomId: string;
  factor: number;
  baseUomId: string;
  /** The product's price, of one base unit, when known. */
  basePrice?: number;
}

/**
 * What saving gives back: the item, plus the product when one was picked
 * here, and its unit when the product's units were loaded.
 */
type OnSave = (
  salesOrderItem: SalesOrderItemFormValues,
  product?: ProductOption,
  unit?: SalesOrderItemUnit,
) => void;

/**
 * Adds an item (no `item`) or edits `item`, in a sheet. It edits the
 * item's values in the sales order form, not the saved ones: saving only
 * changes the form, and the item is stored when the order is.
 */
export function SalesOrderItemSheet({
  open,
  item,
  product,
  takenPositions = [],
  onOpenChange,
  onSave,
}: {
  open: boolean;
  item?: SalesOrderItemFormValues | null;
  /** The item's product, so the picker can name it without a lookup. */
  product?: ProductOption;
  /** The positions of the order's other items: this one can't reuse them. */
  takenPositions?: (number | null)[];
  onOpenChange: (open: boolean) => void;
  onSave: OnSave;
}) {
  const t = useTranslations("salesOrders.items");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{item ? t("edit") : t("add")}</SheetTitle>
          <SheetDescription>{t("savedWith")}</SheetDescription>
        </SheetHeader>
        {/* The content unmounts when the sheet closes, so each opening starts from `item`. */}
        <ItemForm
          item={item ?? undefined}
          product={product}
          takenPositions={takenPositions}
          onSave={(value, product, unit) => {
            onSave(value, product, unit);
            onOpenChange(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

/** The item's fields: blank for a new item, `item`'s for an edit. */
function ItemForm({
  item,
  product: itemProduct,
  takenPositions,
  onSave,
}: {
  item?: SalesOrderItemFormValues;
  product?: ProductOption;
  takenPositions: (number | null)[];
  onSave: OnSave;
}) {
  const t = useTranslations();
  const locale = useLocale();
  // The product last picked in the combobox, so the order's table can show its name.
  const [product, setProduct] = useState(itemProduct);
  // The units the product is sold in (its base unit first), with their
  // factors, as last loaded for `productId`.
  const [loaded, setLoaded] = useState<{
    productId: number;
    units: ProductSaleUnit[];
  } | null>(null);
  const form = useAppForm({
    defaultValues: item ?? salesOrderItem(),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: salesOrderItemSchema },
    onSubmit: ({ value }) => {
      const unit = units.find((candidate) => candidate.uomId === value.uomId);
      onSave(
        value,
        product,
        unit && {
          uomId: unit.uomId,
          factor: unit.factor,
          baseUomId: units[0].uomId,
          basePrice: units[0].price,
        },
      );
    },
  });
  const productId = useStore(form.store, (state) => state.values.productId);
  const units = loaded && loaded.productId === productId ? loaded.units : [];

  // Load the product's units when it changes; a unit it isn't sold in
  // becomes its base unit.
  useEffect(() => {
    if (productId == null) {
      return;
    }
    let current = true;
    getProductSaleUnits(productId).then(
      (units) => {
        if (!current) {
          return;
        }
        setLoaded({ productId, units });
        const chosen = form.getFieldValue("uomId");
        if (units.length && !units.some((unit) => unit.uomId === chosen)) {
          form.setFieldValue("uomId", units[0].uomId);
        }
      },
      () => current && setLoaded({ productId, units: [] }),
    );
    return () => {
      current = false;
    };
  }, [productId, form]);

  const unitOptions = units.map((unit) => ({
    value: unit.uomId,
    label: `${unit.uomId} · ${unit.uom.name}`,
  }));

  return (
    <form
      noValidate
      className="flex flex-1 flex-col overflow-y-auto"
      onSubmit={(e) => {
        e.preventDefault();
        // The sheet is portaled, but React still bubbles the event to the customer form.
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.AppForm>
        <FieldGroup className="px-4">
          <form.AppField
            name="position"
            validators={{
              onChange: ({ value }) =>
                value != null && takenPositions.includes(value)
                  ? "salesOrders.items.positionTaken"
                  : undefined,
            }}
          >
            {(field) => (
              <field.NumberField
                label={t("salesOrders.items.fields.position")}
              />
            )}
          </form.AppField>
          <form.AppField name="productId">
            {(field) => (
              <field.ProductSelectField
                label={t("salesOrders.items.fields.productId")}
                option={itemProduct}
                onProductChange={(picked) => setProduct(picked ?? undefined)}
              />
            )}
          </form.AppField>
          <div className="grid grid-cols-2 items-start gap-2">
            <form.AppField name="quantity">
              {(field) => (
                <field.NumberField
                  label={t("salesOrders.items.fields.quantity")}
                  min={0}
                  step="any"
                />
              )}
            </form.AppField>
            <form.AppField name="uomId">
              {(field) => (
                <field.SelectField
                  label={t("salesOrders.items.fields.uomId")}
                  options={unitOptions}
                  disabled={productId == null}
                >
                  <InputGroupAddon>
                    <RulerIcon />
                  </InputGroupAddon>
                </field.SelectField>
              )}
            </form.AppField>
          </div>
          <form.Subscribe
            selector={(state) => [state.values.quantity, state.values.uomId] as const}
          >
            {([quantity, uomId]) => {
              const unit = units.find((candidate) => candidate.uomId === uomId);
              if (productId == null) {
                return (
                  <p className="text-muted-foreground text-sm">
                    {t("salesOrders.items.pickProductFirst")}
                  </p>
                );
              }
              if (!unit) {
                return null;
              }
              const baseQuantity = quantity == null ? null : Math.round(quantity * unit.factor * 1e6) / 1e6;
              return (
                <div className="text-muted-foreground flex flex-col gap-1 text-sm">
                  {/* The quantity in the base unit, for another unit. */}
                  {baseQuantity != null && unit.source !== "base" && (
                    <p>
                      {t("salesOrders.items.inBaseUnit", {
                        quantity: baseQuantity,
                        unit: units[0].uomId,
                      })}
                    </p>
                  )}
                  <p>
                    {t("salesOrders.items.priceEach", {
                      price: formatCurrency(units[0].price, locale),
                      unit: units[0].uomId,
                    })}
                    {baseQuantity != null &&
                      ` · ${t("salesOrders.items.fields.price")}: ${formatCurrency(
                        multiplyDecimal(units[0].price, baseQuantity, 2),
                        locale,
                      )}`}
                  </p>
                </div>
              );
            }}
          </form.Subscribe>
        </FieldGroup>
        <SheetFooter>
          <form.SubmitButton
            label={t(
              item
                ? "salesOrders.items.save"
                : "salesOrders.items.add",
            )}
          />
          <SheetClose render={<Button type="button" variant="outline" />}>
            {t("common.cancel")}
          </SheetClose>
        </SheetFooter>
      </form.AppForm>
    </form>
  );
}
