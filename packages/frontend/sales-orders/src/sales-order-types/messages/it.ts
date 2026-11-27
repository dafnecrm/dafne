import type { SalesOrderTypesMessages } from "./en.ts";

/** Sales order type texts in Italian: same keys as en.ts, checked by the type. */
export const it: SalesOrderTypesMessages = {
  all: "Tutti i tipi ordine",
  create: "Crea tipo ordine",
  deleteDescription:
    "The sales order type will no longer be listed or editable.",
  editDescription: "Saving replaces the sales order type's details.",
  editMeta: "Modifica tipo ordine",
  empty: {
    filtered: "No sales order type where {filter}.",
    none: "Add your first sales order type to get started.",
    title: "No sales order types found",
  },
  fields: {
    active: "Attivo",
    createdAt: "Creato il",
    description: "Descrizione",
    id: "ID",
    inactive: "Inattivo",
  },
  inactiveAlert: {
    description: "Non può essere utilizzato negli ordini di vendita.",
    title: "Il tipo ordine è disattivato. "
  },
  loading: 'Sto caricando i tipi ordine...',
  new: "Nuovo tipo ordine",
  newDescription: "The sales order type's details.",
  none: 'Nessun tipo ordine trovato',
  notFound: "This sales order type no longer exists.",
  noun: "tipi ordine",
  placeholder: 'Scegli un tipo ordine...',
  sections: { details: "Details" },
  singular: "Tipo ordine",
  title: "Tipi ordine",
};
