import { formOptions } from "@tanstack/react-form-nextjs";
import {
  quotationBodySchema,
  type QuotationStatus,
  type QuotationBody,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { QuotationDetail } from "./types.ts";
import { type QuotationsMessageKey } from "./messages/index.ts";
import type { SalesOrderItemFormValues } from "../schema.ts";

/**
 * Form values: every field is text, "" when blank, but the items (those of
 * a sales order's form: the same sheet edits them). Keys follow the contract.
 */
export type QuotationFormValues = Record<
  Exclude<keyof QuotationBody, "status" | "items">,
  string
> & {
  status: QuotationStatus;
  items: SalesOrderItemFormValues[];
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const quotationSchema =
  formSchema<QuotationFormValues>()(quotationBodySchema);

export const STATUS_OPTIONS = [
  { value: "draft", label: "quotations.status.draft" },
  { value: "sent", label: "quotations.status.sent" },
  { value: "accepted", label: "quotations.status.accepted" },
  { value: "rejected", label: "quotations.status.rejected" },
  { value: "expired", label: "quotations.status.expired" },
] satisfies { value: QuotationStatus; label: QuotationsMessageKey }[];

/** Form values for a new quotation, or for editing `quotation`. */
export function quotationFormOpts(
  quotation?: QuotationDetail,
  defaults?: { customerId?: string | null },
) {
  return formOptions({
    defaultValues: {
      status: quotation?.status ?? "draft",
      notes: quotation?.notes ?? "",
      customerId:
        quotation?.customerId?.toString() ?? defaults?.customerId ?? "",
      typeId: quotation?.typeId ?? "",
      validUntil: quotation?.validUntil?.slice(0, 10) ?? "",
      items:
        quotation?.items.map((item) => ({
          position: item.position,
          productId: item.productId,
          quantity: item.quantity,
          uomId: item.uomId,
        })) ?? [],
    } satisfies QuotationFormValues as QuotationFormValues,
  });
}
