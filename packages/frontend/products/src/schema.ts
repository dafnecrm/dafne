import { formOptions } from "@tanstack/react-form-nextjs";
import { productBodySchema, type ProductBody } from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { ProductDetail } from "./types.ts";

/** A unit the product is also sold in ("" until one is chosen). */
export interface ProductUnitFormValues {
  uomId: string;
}

/**
 * Form values: every field is text, "" when blank, but the units. Keys
 * follow the contract.
 */
export type ProductFormValues = Record<Exclude<keyof ProductBody, "units">, string> & {
  units: ProductUnitFormValues[];
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const productSchema = formSchema<ProductFormValues>()(productBodySchema);

/** Form values for a new product, or for editing `product`. */
export function productFormOpts(product?: ProductDetail) {
  return formOptions({
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product?.price ?? "",
      uomId: product?.uomId ?? "",
      units:
        product?.units.map(({ uomId }) => ({ uomId })) ?? [],
    } satisfies ProductFormValues as ProductFormValues,
  });
}
