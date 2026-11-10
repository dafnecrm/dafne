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
  newDescription: "Il cliente, il tipo e le righe dell'ordine.",
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
    items: "Items",
  },
  fields: {
    createdAt: "Aggiunto",
    id: "ID Ordine",
    notes: "Note",
    customer: "Cliente",
    type: "Tipo",
    items: "Items",
    status: "Status",
    customerId: "Customer id",
    typeId: "Type id"
  },
  items: {
    add: "Aggiungi riga",
    edit: "Modifica riga",
    savedWith: "La riga viene salvata con l'ordine di vendita.",
    loading: "Caricamento della riga…",
    notFound: "La riga non esiste più.",
    loadError: "Impossibile caricare la riga. Riprova.",
    none: "Nessun item creato.",
    noneDetail: "Nessun item è stato ancora creato.",
    addOne: "Aggiungi un nuovo item.",
    positionTaken: "Un'altra riga ha già questa posizione",
    fields: {
      position: "Posizione",
      productId: "Prodotto",
      quantity: "Quantità",
      add: "Aggiungi",
      save: "Salva",
    },
  },
  salesOrderTypes: {
    placeholder: 'Scegli un tipo ordiner...',
    loading: 'Sto caricando i tipi ordine...',
    none: 'Nessun tipo ordine trovato',
  },
  status: { draft: "Draft", open: "Open", completed: "Completed", cancelled: "Cancelled", rejected: "Rejected" }
};
