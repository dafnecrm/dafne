/**
 * Sales order type texts in English. The source of truth: it.ts must have the
 * same keys (SalesOrderTypesMessages), and the apps merge them under
 * `salesOrderTypes`.
 */
export const en = {
  all: "All sales order types",
  create: "Create sales order type",
  deleteDescription:
    "The sales order type will no longer be listed or editable.",
  editDescription: "Saving replaces the sales order type's details.",
  editMeta: "Edit sales order type",
  empty: {
    filtered: "No sales order type where {filter}.",
    none: "Add your first sales order type to get started.",
    title: "No sales order types found",
  },
  fields: {
    active: "Active",
    createdAt: "Added",
    description: "Description",
    id: "Sales order type ID",
    inactive: "Inactive",
  },
  inactiveAlert: {
    description: "It cannot be used in sales orders.",
    title: "Sales order type is inactive."
  },
  loading: 'Loading sales order types...',
  new: "New sales order type",
  newDescription: "The sales order type's details.",
  none: 'No sales order type found',
  notFound: "This sales order type no longer exists.",
  noun: "sales order types",
  placeholder: 'Choose a sales order type...',
  sections: { details: "Details" },
  singular: "Sales order type",
  title: "Sales order types"
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
