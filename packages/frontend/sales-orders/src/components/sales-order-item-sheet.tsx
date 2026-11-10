"use client";

import { useState } from "react";
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
import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { Button } from "@dafne/frontend-ui/components/button";
import type { ProductOption } from "@dafne/frontend-products/actions";

/** What saving gives back: the item, plus the product when one was picked here. */
type OnSave = (
  salesOrderItem: SalesOrderItemFormValues,
  product?: ProductOption,
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
          onSave={(value, product) => {
            onSave(value, product);
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
  // The product last picked in the combobox, so the order's table can show its name.
  const [product, setProduct] = useState(itemProduct);
  const form = useAppForm({
    defaultValues: item ?? salesOrderItem(),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: salesOrderItemSchema },
    onSubmit: ({ value }) => onSave(value, product),
  });

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
          <form.AppField name="quantity">
            {(field) => (
              <field.NumberField
                label={t("salesOrders.items.fields.quantity")}
              />
            )}
          </form.AppField>
        </FieldGroup>
        <SheetFooter>
          <form.SubmitButton
            label={t(
              item
                ? "salesOrders.items.fields.save"
                : "salesOrders.items.fields.add",
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
