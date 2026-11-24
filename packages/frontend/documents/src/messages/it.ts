import type { DocumentsMessages, DocumentTemplatesMessages } from "./en.ts";

/** Document texts in Italian: same keys as en.ts, checked by the types. */
export const documentTemplates: DocumentTemplatesMessages = {
  title: "Modelli di documento",
  singular: "Modello di documento",
  new: "Nuovo modello di documento",
  all: "Tutti i modelli di documento",
  noun: "modelli di documento",
  create: "Crea modello di documento",
  editMeta: "Modifica modello di documento",
  newDescription: "Dai un nome al modello e scegli a cosa serve. Il file Word si carica dalla sua pagina.",
  editDescription: "Salvando sostituisci i dati del modello; il file Word resta.",
  empty: {
    title: "Nessun modello di documento trovato",
    filtered: "Nessun modello di documento dove {filter}.",
    none: "Aggiungi il primo modello di documento per iniziare.",
  },
  deleteDescription: "Il modello non sarà più elencato né modificabile.",
  notFound: "Questo modello di documento non esiste più.",
  sections: {
    details: "Dettagli",
  },
  fields: {
    createdAt: "Aggiunto",
    id: "ID modello",
    name: "Nome",
    resource: "Documento",
    isDefault: "Predefinito per questo documento",
    fileName: "File Word",
    size: "Dimensione",
  },
  resources: {
    quotation: "Offerta",
    salesOrder: "Ordine di vendita",
  },
  file: {
    title: "File Word",
    none: "Nessun file: carica il .docx creato con Word.",
    upload: "Carica .docx",
    replace: "Sostituisci .docx",
    download: "Scarica .docx",
    preview: "Anteprima PDF",
    uploading: "Caricamento…",
    uploaded: "Modello caricato.",
    hint: "Fino a 5 MB. Prima di salvarlo viene provato con dati di esempio.",
  },
  placeholders: {
    title: "Tag disponibili",
    description: "Scrivili nel file Word. <value></value> inserisce un valore, <loop></loop> ripete una riga di tabella per ogni elemento, e i filtri formattano i valori, es. <filter></filter>.",
    loop: "Ripeti per ogni elemento",
    none: "Scegli un documento per vederne i tag.",
  },
  errors: {
    tag: "Tag {tag}: {explanation}",
  },
};

export const documents: DocumentsMessages = {
  pdf: "PDF",
  choose: "PDF con un altro modello",
  defaultTemplate: "Predefinito",
};
