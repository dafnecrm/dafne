import { formOptions } from "@tanstack/react-form-nextjs";
import {
  uomConversionBodySchema,
  type UomConversionBody,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { UomConversionDetail } from "./types.ts";

/**
 * Form values: the units' ids as text ("" when blank), the factor a number
 * (`NumberField`, null when blank). Keys follow the contract.
 */
export type UomConversionFormValues = Record<
  Exclude<keyof UomConversionBody, "factor">,
  string
> & {
  factor: number | null;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages).
 */
export const uomConversionSchema = formSchema<UomConversionFormValues>()(
  uomConversionBodySchema,
);

/**
 * Form values for a new conversion (`fromUomId` preset, e.g. from a unit's
 * page), or for editing `uomConversion`.
 */
export function uomConversionFormOpts(
  uomConversion?: UomConversionDetail,
  defaults?: { fromUomId?: string | null },
) {
  return formOptions({
    defaultValues: {
      fromUomId: uomConversion?.fromUomId ?? defaults?.fromUomId ?? "",
      toUomId: uomConversion?.toUomId ?? "",
      factor: uomConversion?.factor ?? null,
    } satisfies UomConversionFormValues as UomConversionFormValues,
  });
}
