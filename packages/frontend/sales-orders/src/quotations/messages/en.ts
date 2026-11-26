/**
 * Quotation texts in English. The source of truth: it.ts must have the
 * same keys (QuotationsMessages), and the apps merge them under
 * `quotations`.
 */
export const en = {
  title: "Quotations",
  singular: "Quotation",
  new: "New quotation",
  all: "All quotations",
  noun: "quotations",
  create: "Create quotation",
  editMeta: "Edit quotation",
  newDescription: "The quotation's details.",
  editDescription: "Saving replaces the quotation's details.",
  empty: {
    title: "No quotations found",
    filtered: "No quotation where {filter}.",
    none: "Add your first quotation to get started.",
  },
  deleteDescription: "The quotation will no longer be listed or editable.",
  notFound: "This quotation no longer exists.",
  sections: { details: "Details", items: "Items" },
  fields: {
    createdAt: "Added",
    id: "ID",
    status: "Status",
    customerId: "Customer",
    typeId: "Type",
    validUntil: "Valid until",
    notes: "Notes",
    items: "Items",
    total: "Total",
    salesOrder: "Sales order",
    itemsCount: "Items count"
  },
  accept: {
    action: "Accept",
    title: "Accept the quotation?",
    description:
      "The customer accepted it: a draft sales order is created with its items, at the quotation's prices.",
    confirm: "Accept and create the order",
  },
  send: "Mark as sent",
  reject: "Mark as rejected",
  openSalesOrder: "Sales order {id}",
  fromQuotation: "From quotation {id}",
  status: {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type QuotationsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "quotations.fields.id". */
export type QuotationsMessageKey = `quotations.${Paths<QuotationsMessages>}`;
