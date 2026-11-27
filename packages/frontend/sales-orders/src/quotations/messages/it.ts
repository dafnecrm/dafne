import type { QuotationsMessages } from "./en.ts";

/** Quotation texts in Italian: same keys as en.ts, checked by the type. */
export const it: QuotationsMessages = {
  title: "Offerte",
  singular: "Offerta",
  new: "Nuova offerta",
  all: "Tutte le offerte",
  noun: "offerte",
  create: "Crea offerta",
  editMeta: "Modifica offerta",
  newDescription: "I dati dell'offerta.",
  editDescription: "Salvando sostituisci i dati dell'offerta.",
  empty: {
    title: "Nessuna offerta trovata",
    filtered: "Nessuna offerta dove {filter}.",
    none: "Aggiungi la prima offerta per iniziare.",
  },
  deleteDescription: "L'offerta non sarà più elencata né modificabile.",
  notFound: "Questa offerta non esiste più.",
  sections: { 
    details: "Dettagli",
    items: "Righe",
    dates: "Date",
  },
  fields: {
    createdAt: "Aggiunta",
    id: "ID",
    status: "Stato",
    customerId: "Cliente",
    typeId: "Tipo",
    validUntil: "Valida fino al",
    notes: "Note",
    items: "Righe",
    total: "Totale",
    salesOrder: "Ordine di vendita",
    itemsCount: "Num. item",
    acceptedAt: "Accepted at",
    rejectedAt: "Rejected at"
  },
  accept: {
    action: "Accetta",
    title: "Accettare l'offerta?",
    description:
      "Il cliente l'ha accettata: viene creato un ordine di vendita in bozza con le sue righe, ai prezzi dell'offerta.",
    confirm: "Accetta e crea l'ordine",
  },
  send: "Segna come inviata",
  reject: "Segna come rifiutata",
  openSalesOrder: "Ordine di vendita {id}",
  fromQuotation: "Dall'offerta {id}",
  status: {
    draft: "Bozza",
    sent: "Inviata",
    accepted: "Accettata",
    rejected: "Rifiutata",
    expired: "Scaduta",
  },
};
