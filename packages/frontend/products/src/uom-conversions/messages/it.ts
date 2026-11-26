import type { UomConversionsMessages } from "./en.ts";

/** Uom conversion texts in Italian: same keys as en.ts, checked by the type. */
export const it: UomConversionsMessages = {
  title: "Conversioni",
  singular: "Conversione",
  new: "Nuova conversione",
  all: "Tutte le conversioni",
  noun: "conversioni",
  create: "Crea conversione",
  editMeta: "Modifica conversione",
  newDescription: "Quante unità di una fanno un'unità di un'altra dello stesso tipo: 1 kg = 1000 g. Vale per ogni prodotto.",
  editDescription: "Il salvataggio sostituisce la conversione: i prodotti venduti in queste unità useranno il nuovo fattore da ora in poi.",
  empty: {
    title: "Nessuna conversione trovata",
    filtered: "Nessuna conversione dove {filter}.",
    none: "Aggiungi la prima conversione per iniziare.",
  },
  deleteDescription: "I prodotti non si venderanno più in una di queste unità tramite l'altra.",
  notFound: "Questa conversione non esiste più.",
  sections: { details: "Dettagli" },
  fields: {
    createdAt: "Aggiunta",
    id: "ID",
    fromUomId: "Da",
    toUomId: "A",
    uomId: "Unità",
    factor: "Fattore",
    equals: "1 {to} = {factor} {from}",
  },
};
