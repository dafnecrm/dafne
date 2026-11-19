import { formOptions } from "@tanstack/react-form-nextjs";
import { uomBodySchema, type UomKind, type UomBody } from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { UomDetail } from "./types.ts";
import { type UomsMessageKey } from "./messages/index.ts";

/** Form values: every field is text, "" when blank, but the kind. Keys follow the contract. */
export type UomFormValues = Record<Exclude<keyof UomBody, "kind">, string> & {
  kind: UomKind;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const uomSchema = formSchema<UomFormValues>()(uomBodySchema);

export const KIND_OPTIONS = [
  { value: "weight", label: "uoms.kind.weight" },
  { value: "volume", label: "uoms.kind.volume" },
  { value: "length", label: "uoms.kind.length" },
  { value: "area", label: "uoms.kind.area" },
  { value: "count", label: "uoms.kind.count" },
  { value: "time", label: "uoms.kind.time" },
] satisfies { value: UomKind; label: UomsMessageKey }[];

/** Form values for a new uom, or for editing `uom`. */
export function uomFormOpts(uom?: UomDetail) {
  return formOptions({
    defaultValues: {
      id: uom?.id ?? "",
      name: uom?.name ?? "",
      description: uom?.description ?? "",
      kind: uom?.kind ?? "weight",
    } satisfies UomFormValues as UomFormValues,
  });
}
