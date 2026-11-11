/**
 * Sales order type texts in English. The source of truth: it.ts must have the
 * same keys (SalesOrderTypesMessages), and the apps merge them under
 * `salesOrderTypes`.
 */
export const en = {
  title: "Sales order types",
  singular: "Sales order type",
  new: "New sales order type",
  all: "All sales order types",
  noun: "sales order types",
  create: "Create sales order type",
  editMeta: "Edit sales order type",
  newDescription: "The sales order type's details.",
  editDescription: "Saving replaces the sales order type's details.",
  empty: {
    title: "No sales order types found",
    filtered: "No sales order type where {filter}.",
    none: "Add your first sales order type to get started.",
  },
  deleteDescription:
    "The sales order type will no longer be listed or editable.",
  notFound: "This sales order type no longer exists.",
  sections: { details: "Details" },
  fields: {
    createdAt: "Added",
    id: "Sales order type ID",
    description: "Description",
    active: "Active",
    inactive: "Inactive",
  },
  inactiveAlert: {
    title: "Sales order type is inactive.",
    description: "It cannot be used in sales orders."
  },
  placeholder: 'Choose a sales order type...',
  loading: 'Loading sales order types...',
  none: 'No sales order type found'
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type SalesOrderTypesMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "salesOrderTypes.fields.id". */
export type SalesOrderTypesMessageKey =
  `salesOrderTypes.${Paths<SalesOrderTypesMessages>}`;
