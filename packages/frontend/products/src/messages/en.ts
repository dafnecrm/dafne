/**
 * Product texts in English. The source of truth: it.ts must have the same
 * keys (ProductsMessages), and the apps merge them under `products`.
 */
export const en = {
  all: "All products",
  create: "Create product",
  deleteDescription: "The product will no longer be listed or editable.",
  editDescription: "Saving replaces the product's details.",
  editMeta: "Edit product",
  empty: {
    filtered: "No product where {filter}.",
    none: "Add your first product to get started.",
    title: "No products found",
  },
  fields: {
    createdAt: "Added",
    description: "Description",
    id: "ID",
    name: "Name",
    price: "Price",
    uomId: "Unit of measure",
  },
  loadingProducts: "Searching products…",
  new: "New product",
  newDescription: "Only the name is required.",
  noProducts: "No products found.",
  notFound: "This product no longer exists.",
  noun: "products",
  productPlaceholder: "Choose a product…",
  sections: {
    details: "Details",
    units: "Units",
  },
  singular: "Product",
  title: "Products",
  units: {
    add: "Add unit",
    equals: "1 {unit} = {factor} {base}",
    hint: "Units the product is also sold in besides its unit of measure: the ones it has a conversion with (Products › Conversions).",
    none: "No units of its own.",
    remove: "Remove unit",
    uomId: "Unit",
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
