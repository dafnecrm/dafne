import type { DocumentsMessages, DocumentTemplatesMessages } from "./en.ts";

/** Document texts in Italian: same keys as en.ts, checked by the types. */
export const documentTemplates: DocumentTemplatesMessages = {
  all: "Tutti i modelli di documento",
  create: "Crea modello di documento",
  deleteDescription: "Il modello non sarà più elencato né modificabile.",
  editDescription: "Salvando sostituisci i dati del modello; il file Word resta.",
  editMeta: "Modifica modello di documento",
  empty: {
    filtered: "Nessun modello di documento dove {filter}.",
    none: "Aggiungi il primo modello di documento per iniziare.",
    title: "Nessun modello di documento trovato",
  },
  errors: {
    tag: "Tag {tag}: {explanation}",
  },
  fields: {
    createdAt: "Aggiunto",
    fileName: "File Word",
    id: "ID modello",
    isDefault: "Predefinito per questo documento e lingua",
    language: "Lingua",
    name: "Nome",
    resource: "Documento",
    size: "Dimensione",
  },
  file: {
    download: "Scarica .docx",
    hint: "Fino a 5 MB. Prima di salvarlo viene provato con dati di esempio.",
    none: "Nessun file: carica il .docx creato con Word.",
    preview: "Anteprima PDF",
    replace: "Sostituisci .docx",
    title: "File Word",
    upload: "Carica .docx",
    uploaded: "Modello caricato.",
    uploading: "Caricamento…",
  },
  languages: {
    en: "Inglese",
    it: "Italiano",
  },
  new: "Nuovo modello di documento",
  newDescription: "Dai un nome al modello e scegli a cosa serve. Il file Word si carica dalla sua pagina.",
  notFound: "Questo modello di documento non esiste più.",
  noun: "modelli di documento",
  placeholders: {
    description: "Scrivili nel file Word. <value></value> inserisce un valore, <loop></loop> ripete una riga di tabella per ogni elemento, e i filtri formattano i valori, es. <filter></filter>.",
    loop: "Ripeti per ogni elemento",
    none: "Scegli un documento per vederne i tag.",
    title: "Tag disponibili",
  },
  resources: {
    quotation: "Offerta",
    salesOrder: "Ordine di vendita",
  },
  sections: {
    details: "Dettagli",
  },
  singular: "Modello di documento",
  title: "Modelli di documento",
};

export const documents: DocumentsMessages = {
  choose: "PDF con un altro modello",
  defaultTemplate: "Predefinito",
  languages: {
    en: "Inglese",
    it: "Italiano",
  },
  pdf: "PDF",
  title: "Documenti",
};
