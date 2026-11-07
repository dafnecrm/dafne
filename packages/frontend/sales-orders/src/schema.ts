import { formOptions } from "@tanstack/react-form-nextjs";
import { orderBodySchema, type OrderBody } from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { OrderDetail } from "./types.ts";

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type OrderFormValues = Record<keyof OrderBody, string>;

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const orderSchema = formSchema<OrderFormValues>()(orderBodySchema);

/** Form values for a new order, or for editing `order`. */
export function orderFormOpts(order?: OrderDetail) {
  return formOptions({
    defaultValues: {
      notes: order?.notes ?? "",
      customerId: order ? String(order.customerId) : "",
    } satisfies OrderFormValues as OrderFormValues,
  });
}
