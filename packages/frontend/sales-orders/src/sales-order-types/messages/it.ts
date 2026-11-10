import type { SalesOrderTypesMessages } from "./en.ts";

/** Sales order type texts in Italian: same keys as en.ts, checked by the type. */
export const it: SalesOrderTypesMessages = {
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
  },
};
