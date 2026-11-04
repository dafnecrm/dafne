import { formOptions } from "@tanstack/react-form-nextjs";
import { productBodySchema, type ProductBody } from "@dafne/contracts";
import { formSchema } from "@/lib/app-form/form-schema";
import type { ProductDetail } from "@/lib/products";

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type ProductFormValues = Record<keyof ProductBody, string>;

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
    } satisfies ProductFormValues as ProductFormValues,
  });
}
