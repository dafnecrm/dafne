import { formOptions } from "@tanstack/react-form-nextjs";
import {
  salesOrderBodySchema,
  salesOrderItemBodySchema,
  type SalesOrderBody,
  type SalesOrderItem,
  type SalesOrderItemBody,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { SalesOrderDetail } from "./types.ts";

/**
 * Form values: every field is text, "" when blank, except the item's
 * numbers (`NumberField`, `ProductSelectField`: a number, null when blank).
 * Keys follow the contract.
 */
export type SalesOrderItemFormValues = Record<
  Exclude<keyof SalesOrderItemBody, "position" | "productId" | "quantity">,
  string
> & {
  position: number | null;
  productId: number | null;
  quantity: number | null;
};

export type SalesOrderFormValues = Record<
  Exclude<keyof SalesOrderBody, "items">,
  string
> & {
  items: SalesOrderItemFormValues[];
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const salesOrderSchema =
  formSchema<SalesOrderFormValues>()(salesOrderBodySchema);

/** Form values for a new sales order, or for editing `salesOrder`. */
export function salesOrderFormOpts(salesOrder?: SalesOrderDetail) {
  return formOptions({
    defaultValues: {
      notes: salesOrder?.notes ?? "",
      customerId: salesOrder ? String(salesOrder.customerId) : "",
      typeId: salesOrder?.typeId ?? "",
      items:
        salesOrder?.items.map((item) => ({
          position: item.position,
          productId: item.productId,
          quantity: item.quantity,
        })) ?? [],
    } satisfies SalesOrderFormValues as SalesOrderFormValues,
  });
}

export const salesOrderItemSchema = formSchema<SalesOrderItemFormValues>()(
  salesOrderItemBodySchema,
);

/** Form values for a new item (all blank), or for editing `item`. */
export const salesOrderItem = (
  item?: SalesOrderItem,
): SalesOrderItemFormValues => ({
  position: item?.position ?? null,
  productId: item?.productId ?? null,
  quantity: item?.quantity ?? null,
});
