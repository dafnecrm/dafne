import { formOptions } from "@tanstack/react-form-nextjs";
import {
  salesOrderTypeBodySchema,
  type SalesOrderTypeBody,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { SalesOrderTypeDetail } from "./types.ts";

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type SalesOrderTypeFormValues = Record<keyof SalesOrderTypeBody, string>;

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const salesOrderTypeSchema = formSchema<SalesOrderTypeFormValues>()(
  salesOrderTypeBodySchema,
);

/** Form values for a new sales order type, or for editing `salesOrderType`. */
export function salesOrderTypeFormOpts(salesOrderType?: SalesOrderTypeDetail) {
  return formOptions({
    defaultValues: {
      id: salesOrderType?.id ?? "",
      description: salesOrderType?.description ?? "",
    } satisfies SalesOrderTypeFormValues as SalesOrderTypeFormValues,
  });
}
