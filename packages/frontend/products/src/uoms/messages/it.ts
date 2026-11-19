import type { UomsMessages } from "./en.ts";

/** Uom texts in Italian: same keys as en.ts, checked by the type. */
export const it: UomsMessages = {
  title: "Unità di misura",
  singular: "Unità di misura",
  new: "Nuova unità di misura",
  all: "Tutte le unità di misura",
  noun: "unità di misura",
  create: "Crea unità di misura",
  editMeta: "Modifica unità di misura",
  newDescription: "Simbolo, nome, tipo e conversioni dell'unità.",
  editDescription: "Il salvataggio sostituisce i dati dell'unità e le sue conversioni.",
  empty: {
    title: "Nessuna unità di misura trovata",
    filtered: "Nessuna unità di misura dove {filter}.",
    none: "Aggiungi la prima unità di misura per iniziare.",
  },
  deleteDescription: "L'unità non sarà più elencata né modificabile.",
  notFound: "Questa unità di misura non esiste più.",
  placeholder: "Scegli un'unità",
  sections: { details: "Dettagli", conversions: "Conversioni" },
  fields: {
    createdAt: "Aggiunta",
    id: "Simbolo",
    idHint: "Es. kg. Non si potrà cambiare in seguito.",
    name: "Nome",
    description: "Descrizione",
    kind: "Tipo",
  },
  kind: {
    weight: "Peso",
    volume: "Volume",
    length: "Lunghezza",
    area: "Superficie",
    count: "Quantità",
    time: "Tempo",
  },
  conversions: {
    add: "Aggiungi conversione",
    none: "Ancora nessuna conversione.",
    equals: "1 {to} = {factor} {from}",
  },
};
