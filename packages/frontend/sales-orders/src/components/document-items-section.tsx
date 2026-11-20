"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { multiplyDecimal } from "@dafne/contracts";
import type { ProductOption } from "@dafne/frontend-products/actions";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import type { SalesOrderItemFormValues } from "../schema.ts";
import type { SalesOrderDetailItem } from "../types.ts";
import { SalesOrderItemTable } from "./sales-order-items-table.tsx";
import { SalesOrderItemSheet, type SalesOrderItemUnit } from "./sales-order-item-sheet.tsx";

/**
 * The items of a document's form (a sales order, a quotation): their
 * table, with the base quantities and prices the backend will compute, and
 * the sheet that adds or edits one. It edits the form's values (`items`,
 * through the callbacks); `savedItems` are the document's as saved, which
 * name the products and keep their prices when unchanged.
 */
export function DocumentItemsSection({
  items,
  savedItems,
  onAdd,
  onReplace,
  onRemove,
}: {
  items: SalesOrderItemFormValues[];
  savedItems?: SalesOrderDetailItem[];
  onAdd: (item: SalesOrderItemFormValues) => void;
  onReplace: (index: number, item: SalesOrderItemFormValues) => void;
  onRemove: (index: number) => void;
}) {
  const t = useTranslations();

  // The form's items hold only the product's ID: its name comes from the
  // saved items, or from the sheet's combobox for a product picked there.
  const savedProducts = useMemo(
    () => new Map(savedItems?.map((item) => [item.productId, item.product])),
    [savedItems],
  );
  const [pickedProducts, setPickedProducts] = useState(() => new Map<number, ProductOption>());
  const savedProduct = (productId: number | null) =>
    productId == null ? undefined : savedProducts.get(productId);
  const productOf = (productId: number | null) =>
    productId == null ? undefined : (pickedProducts.get(productId) ?? savedProducts.get(productId));

  // The factors of the items' units, by product and unit, so the table can
  // show the base quantity: from the saved items, then from the sheet.
  const unitKey = (productId: number | null, uomId: string) => `${productId}:${uomId}`;
  const savedUnits = useMemo(
    () =>
      new Map(
        savedItems?.map((item) => [
          unitKey(item.productId, item.uomId),
          {
            uomId: item.uomId,
            factor: item.baseQuantity / item.quantity,
            baseUomId: item.product.uom.id,
          } satisfies SalesOrderItemUnit,
        ]),
      ),
    [savedItems],
  );
  const [pickedUnits, setPickedUnits] = useState(() => new Map<string, SalesOrderItemUnit>());
  const unitOf = (productId: number | null, uomId: string) => {
    const key = unitKey(productId, uomId);
    return pickedUnits.get(key) ?? savedUnits.get(key);
  };

  const [sheet, setSheet] = useState<{ open: boolean; index: number | null }>({
    open: false,
    index: null,
  });

  return (
    <>
      <DetailSection
        title={t("salesOrders.sections.items")}
        groupClassName="flex"
        actions={
          <Button variant="outline" size="xs" onClick={() => setSheet({ open: true, index: null })}>
            {t("salesOrders.items.add")}
          </Button>
        }
      >
        <SalesOrderItemTable
          items={items.map((item) => {
            const unit = unitOf(item.productId, item.uomId);
            const baseQuantity =
              unit && item.quantity != null ? Math.round(item.quantity * unit.factor * 1e6) / 1e6 : undefined;
            // As the backend does: an item saved as it is keeps its price.
            const saved = savedItems?.find(
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
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("common.actionsFor", {
                      name: `${t("salesOrders.items.singular")} ${item.position}`,
                    })}
                  />
                }
              >
                <EllipsisVerticalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSheet({ open: true, index: i })}>
                  <PencilIcon />
                  {t("salesOrders.items.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onRemove(i)}>
                  <Trash2Icon />
                  {t("salesOrders.items.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </DetailSection>
      <SalesOrderItemSheet
        open={sheet.open}
        takenPositions={items.filter((_, i) => i !== sheet.index).map((item) => item.position)}
        item={sheet.index === null ? null : items[sheet.index]}
        product={sheet.index === null ? undefined : productOf(items[sheet.index].productId)}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        onSave={(item, product, unit) => {
          if (product) {
            setPickedProducts((picked) => new Map(picked).set(product.id, product));
          }
          if (unit) {
            setPickedUnits((picked) => new Map(picked).set(unitKey(item.productId, unit.uomId), unit));
          }
          if (sheet.index === null) {
            onAdd(item);
          } else {
            onReplace(sheet.index, item);
          }
        }}
      />
    </>
  );
}

/**
 * Whether some saved item's price isn't its product's of today: the form
 * then offers "Save changes and update prices" (`reprice`).
 */
export const hasOutdatedPrices = (savedItems?: SalesOrderDetailItem[]) =>
  savedItems?.some(
    (item) =>
      item.product.price != null &&
      item.baseQuantity != null &&
      multiplyDecimal(item.product.price, item.baseQuantity, 2) !== item.price,
  ) ?? false;
