import type { SalesOrderTypesMessages } from "./en.ts";

/** Sales order type texts in Italian: same keys as en.ts, checked by the type. */
export const it: SalesOrderTypesMessages = {
  title: "Tipi ordine",
  singular: "Tipo ordine",
  new: "Nuovo tipo ordine",
  all: "Tutti i tipi ordine",
  noun: "tipi ordine",
  create: "Crea tipo ordine",
  editMeta: "Modifica tipo ordine",
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
    createdAt: "Creato il",
    id: "ID",
    description: "Descrizione",
    active: "Attivo",
    inactive: "Inattivo",
  },
  inactiveAlert: {
    title: "Il tipo ordine è disattivato. ",
    description: "Non può essere utilizzato negli ordini di vendita."
  }
};
