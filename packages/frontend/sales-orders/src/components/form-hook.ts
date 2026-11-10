import { createAppFormHook } from "@dafne/frontend-forms/client";
import { CustomerSelectField } from "@dafne/frontend-customers/components/customer-select-field";
import { ProductSelectField } from "@dafne/frontend-products/components/product-select-field";
import { SalesOrderTypeSelectField } from "../sales-order-types/components/sales-order-type-select-field";

/** The sales order forms' hook: the generic fields plus the customer and product pickers. */
export const useAppForm = createAppFormHook({
  CustomerSelectField,
  ProductSelectField,
  SalesOrderTypeSelectField,
});
