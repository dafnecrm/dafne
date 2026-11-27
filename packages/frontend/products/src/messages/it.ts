import type { ProductsMessages } from "./en.ts";

/** Product texts in Italian: same keys as en.ts, checked by the type. */
export const it: ProductsMessages = {
  all: "Tutti i prodotti",
  create: "Crea prodotto",
  deleteDescription: "Il prodotto non sarà più elencato né modificabile.",
  editDescription: "Il salvataggio sostituisce i dati del prodotto.",
  editMeta: "Modifica prodotto",
  empty: {
    filtered: "Nessun prodotto dove {filter}.",
    none: "Aggiungi il primo prodotto per iniziare.",
    title: "Nessun prodotto trovato",
  },
  fields: {
    createdAt: "Aggiunto",
    description: "Descrizione",
    id: "ID",
    name: "Nome",
    price: "Prezzo",
    uomId: "Unità di misura",
  },
  loadingProducts: "Ricerca prodotti…",
  new: "Nuovo prodotto",
  newDescription: "Solo il nome è obbligatorio.",
  noProducts: "Nessun prodotto trovato.",
  notFound: "Questo prodotto non esiste più.",
  noun: "prodotti",
  productPlaceholder: "Scegli un prodotto…",
  sections: {
    details: "Dati",
    units: "Unità",
  },
  singular: "Prodotto",
  title: "Prodotti",
  units: {
    add: "Aggiungi unità",
    equals: "1 {unit} = {factor} {base}",
    hint: "Unità in cui si vende anche il prodotto oltre alla sua unità di misura: quelle con cui ha una conversione (Prodotti › Conversioni).",
    none: "Nessuna unità propria.",
    remove: "Rimuovi unità",
    uomId: "Unità",
  },
};
