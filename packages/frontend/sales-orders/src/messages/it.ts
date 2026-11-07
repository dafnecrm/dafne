import type { SalesOrdersMessages } from "./en.ts";

/** Sales order texts in Italian: same keys as en.ts, checked by the type. */
export const it: SalesOrdersMessages = {
  title: "Ordini di vendita",
  singular: "Ordine di vendita",
  new: "Nuovo ordine",
  all: "Tutti gli ordini",
  noun: "ordini",
  create: "Crea ordine",
  editMeta: "Modifica ordine",
  newDescription: "Solo il nome è richiesto.",
  editDescription: "Il salvataggio sostituisce i dettagli dell'ordine.",
  empty: {
    title: "Nessun ordine trovato",
    filtered: "Nessun ordine corrispondente a {filter}.",
    none: "Aggiungi il tuo primo ordine per iniziare.",
  },
  deleteDescription: "L'ordine non sarà più elencato o modificabile.",
  notFound: "Questo ordine non esiste più.",
  sections: {
    details: "Dettaglio",
  },
  fields: {
    createdAt: "Aggiunto",
    id: "ID Ordine",
    notes: "Note",
    customer: "Cliente",
  },
};
