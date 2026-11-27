import type { UomsMessages } from "./en.ts";

/** Uom texts in Italian: same keys as en.ts, checked by the type. */
export const it: UomsMessages = {
  all: "Tutte le unità di misura",
  conversions: {
    add: "Aggiungi conversione",
    equals: "1 {to} = {factor} {from}",
    none: "Ancora nessuna conversione.",
  },
  create: "Crea unità di misura",
  deleteDescription: "L'unità non sarà più elencata né modificabile.",
  editDescription: "Il salvataggio sostituisce i dati dell'unità e le sue conversioni.",
  editMeta: "Modifica unità di misura",
  empty: {
    filtered: "Nessuna unità di misura dove {filter}.",
    none: "Aggiungi la prima unità di misura per iniziare.",
    title: "Nessuna unità di misura trovata",
  },
  fields: {
    createdAt: "Aggiunta",
    description: "Descrizione",
    id: "Simbolo",
    idHint: "Es. kg. Non si potrà cambiare in seguito.",
    kind: "Tipo",
    name: "Nome",
  },
  kind: {
    area: "Superficie",
    count: "Quantità",
    length: "Lunghezza",
    time: "Tempo",
    volume: "Volume",
    weight: "Peso",
  },
  new: "Nuova unità di misura",
  newDescription: "Simbolo, nome, tipo e conversioni dell'unità.",
  notFound: "Questa unità di misura non esiste più.",
  noun: "unità di misura",
  placeholder: "Scegli un'unità",
  sections: { conversions: "Conversioni", details: "Dettagli" },
  singular: "Unità di misura",
  title: "Unità di misura",
};
