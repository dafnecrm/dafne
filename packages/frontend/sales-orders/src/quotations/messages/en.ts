/**
 * Quotation texts in English. The source of truth: it.ts must have the
 * same keys (QuotationsMessages), and the apps merge them under
 * `quotations`.
 */
export const en = {
  accept: {
    action: "Accept",
    confirm: "Accept and create the order",
    description:
      "The customer accepted it: a draft sales order is created with its items, at the quotation's prices.",
    title: "Accept the quotation?",
  },
  all: "All quotations",
  create: "Create quotation",
  deleteDescription: "The quotation will no longer be listed or editable.",
  editDescription: "Saving replaces the quotation's details.",
  editMeta: "Edit quotation",
  empty: {
    filtered: "No quotation where {filter}.",
    none: "Add your first quotation to get started.",
    title: "No quotations found",
  },
  fields: {
    acceptedAt: 'Accepted at',
    createdAt: "Added",
    customerId: "Customer",
    id: "ID",
    items: "Items",
    itemsCount: "Items count",
    notes: "Notes",
    rejectedAt: 'Rejected at',
    salesOrder: "Sales order",
    status: "Status",
    total: "Total",
    typeId: "Type",
    validUntil: "Valid until"
  },
  fromQuotation: "From quotation {id}",
  new: "New quotation",
  newDescription: "The quotation's details.",
  notFound: "This quotation no longer exists.",
  noun: "quotations",
  openSalesOrder: "Sales order {id}",
  reject: "Mark as rejected",
  sections: { 
    dates: "Dates", 
    details: "Details",
    items: "Items",
  },
  send: "Mark as sent",
  singular: "Quotation",
  status: {
    accepted: "Accepted",
    draft: "Draft",
    expired: "Expired",
    rejected: "Rejected",
    sent: "Sent",
  },
  title: "Quotations",
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type QuotationsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "quotations.fields.id". */
export type QuotationsMessageKey = `quotations.${Paths<QuotationsMessages>}`;
