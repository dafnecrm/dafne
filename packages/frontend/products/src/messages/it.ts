import type { ProductsMessages } from "./en.ts";

/** Product texts in Italian: same keys as en.ts, checked by the type. */
export const it: ProductsMessages = {
  title: "Prodotti",
  singular: "Prodotto",
  new: "Nuovo prodotto",
  all: "Tutti i prodotti",
  noun: "prodotti",
  create: "Crea prodotto",
  editMeta: "Modifica prodotto",
  newDescription: "Solo il nome è obbligatorio.",
  editDescription: "Il salvataggio sostituisce i dati del prodotto.",
  empty: {
    title: "Nessun prodotto trovato",
    filtered: "Nessun prodotto dove {filter}.",
    none: "Aggiungi il primo prodotto per iniziare.",
  },
  deleteDescription: "Il prodotto non sarà più elencato né modificabile.",
  notFound: "Questo prodotto non esiste più.",
  sections: {
    details: "Dati",
  },
  fields: {
    name: "Nome",
    price: "Prezzo",
    description: "Descrizione",
    createdAt: "Aggiunto",
    id: "ID prodotto",
  },
};
