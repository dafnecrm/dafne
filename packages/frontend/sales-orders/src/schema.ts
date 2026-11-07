import { formOptions } from "@tanstack/react-form-nextjs";
import { salesOrderBodySchema, type SalesOrderBody } from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { SalesOrderDetail } from "./types.ts";

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type SalesOrderFormValues = Record<keyof SalesOrderBody, string>;

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const salesOrderSchema = formSchema<SalesOrderFormValues>()(salesOrderBodySchema);

/** Form values for a new sales order, or for editing `salesOrder`. */
export function salesOrderFormOpts(salesOrder?: SalesOrderDetail) {
  return formOptions({
    defaultValues: {
      notes: salesOrder?.notes ?? "",
      customerId: salesOrder ? String(salesOrder.customerId) : "",
    } satisfies SalesOrderFormValues as SalesOrderFormValues,
  });
}
