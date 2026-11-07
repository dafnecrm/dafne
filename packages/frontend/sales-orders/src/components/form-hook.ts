import { createAppFormHook } from "@dafne/frontend-forms/client";
import { CustomerSelectField } from "@dafne/frontend-customers/components/customer-select-field";
import { ProductSelectField } from "@dafne/frontend-products/components/product-select-field";

/** The order forms' hook: the generic fields plus the customer and product pickers. */
export const useAppForm = createAppFormHook({ CustomerSelectField, ProductSelectField });
