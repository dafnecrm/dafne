/**
 * Sales order texts in English. The source of truth: it.ts must have the
 * same keys (SalesOrdersMessages), and the apps merge them under
 * `salesOrders`.
 */
export const en = {
  all: "All orders",
  create: "Create order",
  /** The section on a customer's page. */
  customerSection: {
    delete: "Delete order",
    detail: "Show details",
    edit: "Edit order",
    empty: {
      description: "This customer has no sales orders yet.",
      title: "No sales orders",
    },
    loadError: "Couldn't load the sales orders. Try again.",
    loading: "Loading the sales orders…",
    new: "Create order",
    retry: "Try again",
    title: "Last {limit} sales orders",
    viewAll: "View all ({count})",
  },
  deleteDescription: "The order will no longer be listed or editable.",
  editDescription: "Saving replaces the order's details.",
  editMeta: "Edit order",
  empty: {
    filtered: "No order where {filter}.",
    none: "Add your first order to get started.",
    title: "No orders found",
  },
  fields: {
    createdAt: "Added",
    customer: "Customer",
    customerId: 'Customer id',
    id: "ID",
    items: "Items",
    itemsCount: "Items count",
    notes: "Notes",
    status: 'Status',
    type: "Type",
    typeId: 'Type id'
  },
  items: {
    add: "Add",
    delete: "Delete",
    edit: "Edit",
    fields: {
      basePrice: "Unit price",
      baseQuantity: "In the base unit",
      position: "Position",
      price: "Price",
      productId: "Product",
      quantity: "Quantity",
      uomId: "Unit",
    },
    inBaseUnit: "= {quantity} {unit}",
    loadError: "Couldn't load the item. Try again.",
    loading: "Loading the item…",
    none: "No item yet.",
    noneDetail: "No item has been added.",
    notFound: "The item no longer exists.",
    pickProductFirst: "Choose the product first",
    plural: "Sales order items",
    positionTaken: "Another item already has this position",
    priceEach: "{price} per {unit}",
    priceNeedsRecaulation: "Price needs to be recalculated.",
    save: "Update",
    savedWith: "The item is saved with the sales order.",
    singular: "Sales order item",
  },
  new: "New order",
  newDescription: "The order's customer, type and items.",
  notFound: "This order no longer exists.",
  noun: "orders",
  saveChangesAndUpdatePrices: "Save changes and update prices",
  sections: {
    details: "Details",
    items: "Items",
  },
  singular: "Sales order",
  status: { cancelled: 'Cancelled', completed: 'Completed', draft: 'Draft', open: 'Open', rejected: 'Rejected' },
  title: "Sales orders",
  totalPrice: "Total price"
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type SalesOrdersMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "salesOrders.fields.id". */
export type SalesOrdersMessageKey = `salesOrders.${Paths<SalesOrdersMessages>}`;
