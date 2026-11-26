/**
 * Sales order texts in English. The source of truth: it.ts must have the
 * same keys (SalesOrdersMessages), and the apps merge them under
 * `salesOrders`.
 */
export const en = {
  title: "Sales orders",
  singular: "Sales order",
  totalPrice: "Total price",
  new: "New order",
  all: "All orders",
  noun: "orders",
  create: "Create order",
  editMeta: "Edit order",
  newDescription: "The order's customer, type and items.",
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
    items: "Items",
  },
  fields: {
    createdAt: "Added",
    id: "ID",
    notes: "Notes",
    customer: "Customer",
    type: "Type",
    items: "Items",
    status: 'Status',
    customerId: 'Customer id',
    typeId: 'Type id',
    itemsCount: "Items count"
  },
  items: {
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Update",
    singular: "Sales order item",
    plural: "Sales order items",
    savedWith: "The item is saved with the sales order.",
    loading: "Loading the item…",
    notFound: "The item no longer exists.",
    loadError: "Couldn't load the item. Try again.",
    none: "No item yet.",
    noneDetail: "No item has been added.",
    positionTaken: "Another item already has this position",
    pickProductFirst: "Choose the product first",
    inBaseUnit: "= {quantity} {unit}",
    priceEach: "{price} per {unit}",
    priceNeedsRecaulation: "Price needs to be recalculated.",
    fields: {
      position: "Position",
      productId: "Product",
      quantity: "Quantity",
      uomId: "Unit",
      baseQuantity: "In the base unit",
      basePrice: "Unit price",
      price: "Price",
    },
  },
  status: { draft: 'Draft', open: 'Open', completed: 'Completed', cancelled: 'Cancelled', rejected: 'Rejected' },
  /** The section on a customer's page. */
  customerSection: {
    title: "Last {limit} sales orders",
    loading: "Loading the sales orders…",
    loadError: "Couldn't load the sales orders. Try again.",
    retry: "Try again",
    viewAll: "View all ({count})",
    new: "Create order",
    detail: "Show details",
    edit: "Edit order",
    delete: "Delete order",
    empty: {
      title: "No sales orders",
      description: "This customer has no sales orders yet.",
    },
  },
  saveChangesAndUpdatePrices: "Save changes and update prices"
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type SalesOrdersMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "salesOrders.fields.id". */
export type SalesOrdersMessageKey = `salesOrders.${Paths<SalesOrdersMessages>}`;
