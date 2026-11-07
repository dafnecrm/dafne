/**
 * Sales order texts in English. The source of truth: it.ts must have the
 * same keys (SalesOrdersMessages), and the apps merge them under
 * `salesOrders`.
 */
export const en = {
  title: "Sales orders",
  singular: "Sales order",
  new: "New order",
  all: "All orders",
  noun: "orders",
  create: "Create order",
  editMeta: "Edit order",
  newDescription: "Only the name is required.",
  editDescription: "Saving replaces the order's details.",
  empty: {
    title: "No orders found",
    filtered: "No order where {filter}.",
    none: "Add your first order to get started.",
  },
  deleteDescription: "The order will no longer be listed or editable.",
  notFound: "This order no longer exists.",
  sections: {
    details: "Details",
  },
  fields: {
    createdAt: "Added",
    id: "Order ID",
    notes: "Notes",
    customer: "Customer",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type SalesOrdersMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "salesOrders.fields.id". */
export type SalesOrdersMessageKey = `salesOrders.${Paths<SalesOrdersMessages>}`;
