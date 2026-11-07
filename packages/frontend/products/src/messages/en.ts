/**
 * Product texts in English. The source of truth: it.ts must have the same
 * keys (ProductsMessages), and the apps merge them under `products`.
 */
export const en = {
  title: "Products",
  singular: "Product",
  new: "New product",
  all: "All products",
  noun: "products",
  create: "Create product",
  editMeta: "Edit product",
  newDescription: "Only the name is required.",
  editDescription: "Saving replaces the product's details.",
  empty: {
    title: "No products found",
    filtered: "No product where {filter}.",
    none: "Add your first product to get started.",
  },
  deleteDescription: "The product will no longer be listed or editable.",
  notFound: "This product no longer exists.",
  sections: {
    details: "Details",
  },
  fields: {
    name: "Name",
    price: "Price",
    description: "Description",
    createdAt: "Added",
    id: "Product ID",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type ProductsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "products.fields.name". */
export type ProductsMessageKey = `products.${Paths<ProductsMessages>}`;
