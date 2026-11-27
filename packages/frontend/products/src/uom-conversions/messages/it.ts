import type { UomConversionsMessages } from "./en.ts";

/** Uom conversion texts in Italian: same keys as en.ts, checked by the type. */
export const it: UomConversionsMessages = {
  all: "Tutte le conversioni",
  create: "Crea conversione",
  deleteDescription: "I prodotti non si venderanno più in una di queste unità tramite l'altra.",
  editDescription: "Il salvataggio sostituisce la conversione: i prodotti venduti in queste unità useranno il nuovo fattore da ora in poi.",
  editMeta: "Modifica conversione",
  empty: {
    filtered: "Nessuna conversione dove {filter}.",
    none: "Aggiungi la prima conversione per iniziare.",
    title: "Nessuna conversione trovata",
  },
  fields: {
    createdAt: "Aggiunta",
    equals: "1 {to} = {factor} {from}",
    factor: "Fattore",
    fromUomId: "Da",
    id: "ID",
    toUomId: "A",
    uomId: "Unità",
  },
  new: "Nuova conversione",
  newDescription: "Quante unità di una fanno un'unità di un'altra dello stesso tipo: 1 kg = 1000 g. Vale per ogni prodotto.",
  notFound: "Questa conversione non esiste più.",
  noun: "conversioni",
  sections: { details: "Dettagli" },
  singular: "Conversione",
  title: "Conversioni",
};
