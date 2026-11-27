import type { QuotationsMessages } from "./en.ts";

/** Quotation texts in Italian: same keys as en.ts, checked by the type. */
export const it: QuotationsMessages = {
  accept: {
    action: "Accetta",
    confirm: "Accetta e crea l'ordine",
    description:
      "Il cliente l'ha accettata: viene creato un ordine di vendita in bozza con le sue righe, ai prezzi dell'offerta.",
    title: "Accettare l'offerta?",
  },
  all: "Tutte le offerte",
  create: "Crea offerta",
  deleteDescription: "L'offerta non sarà più elencata né modificabile.",
  editDescription: "Salvando sostituisci i dati dell'offerta.",
  editMeta: "Modifica offerta",
  empty: {
    filtered: "Nessuna offerta dove {filter}.",
    none: "Aggiungi la prima offerta per iniziare.",
    title: "Nessuna offerta trovata",
  },
  fields: {
    acceptedAt: "Accepted at",
    createdAt: "Aggiunta",
    customerId: "Cliente",
    id: "ID",
    items: "Righe",
    itemsCount: "Num. item",
    notes: "Note",
    rejectedAt: "Rejected at",
    salesOrder: "Ordine di vendita",
    status: "Stato",
    total: "Totale",
    typeId: "Tipo",
    validUntil: "Valida fino al"
  },
  fromQuotation: "Dall'offerta {id}",
  new: "Nuova offerta",
  newDescription: "I dati dell'offerta.",
  notFound: "Questa offerta non esiste più.",
  noun: "offerte",
  openSalesOrder: "Ordine di vendita {id}",
  reject: "Segna come rifiutata",
  sections: { 
    dates: "Date",
    details: "Dettagli",
    items: "Righe",
  },
  send: "Segna come inviata",
  singular: "Offerta",
  status: {
    accepted: "Accettata",
    draft: "Bozza",
    expired: "Scaduta",
    rejected: "Rifiutata",
    sent: "Inviata",
  },
  title: "Offerte",
};
