import type { ActivitiesMessages } from "./en.ts";

/** Customer texts in Italian: same keys as en.ts, checked by the type. */
export const it: ActivitiesMessages = {
  title: "Attività",
  singular: "Attività",
  new: "Nuova attività",
  all: "Tutte le attività",
  noun: "attività",
  create: "Crea attività",
  editMeta: "Modifica attività",
  newDescription: "Solo il nome è obbligatorio.",
  editDescription: "Il salvataggio sostituisce i dati dell'attività.",
  empty: {
    title: "Nessuna attività trovata",
    filtered: "Nessuna attività dove {filter}.",
    none: "Aggiungi la prima attività per iniziare."
  },
  deleteDescription: "L'attività non sarà più elencata né modificabile.",
  notFound: "Questa attività non esiste più.",
  reopen: "Riapri",
  reopenTitle: "Riaprire {name}?",
  reopenDescription: "L'attività tornerà aperta e modificabile.",
  close: "Chiudi",
  closeTitle: "Chiudere {name}?",
  closeDescription: "L'attività non sarà più modificabile.",
  sections: {
    details: "Dati"
  },
  fields: {
    name: "Nome",
    type: "Tipo",
    status: "Stato",
    dueDate: "Scadenza",
    notes: "Note",
    completedAt: "Completata il",
    completedBy: "Completata da",
    createdAt: "Aggiunta",
    id: "ID"
  },
  type: {
    call: "Chiamata",
    email: "Email",
    meeting: "Riunione",
    task: "Compito"
  },
  status: {
    open: "Aperta",
    closed: "Chiusa"
  }
};
