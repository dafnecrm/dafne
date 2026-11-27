import type { ActivitiesMessages } from "./en.ts";

/** Customer texts in Italian: same keys as en.ts, checked by the type. */
export const it: ActivitiesMessages = {
  all: "Tutte le attività",
  close: "Chiudi",
  closeDescription: "L'attività non sarà più modificabile.",
  closeTitle: "Chiudere {name}?",
  create: "Crea attività",
  deleteDescription: "L'attività non sarà più elencata né modificabile.",
  editDescription: "Il salvataggio sostituisce i dati dell'attività.",
  editMeta: "Modifica attività",
  empty: {
    filtered: "Nessuna attività dove {filter}.",
    none: "Aggiungi la prima attività per iniziare.",
    title: "Nessuna attività trovata"
  },
  fields: {
    completedAt: "Completata il",
    completedBy: "Completata da",
    createdAt: "Aggiunta",
    dueDate: "Scadenza",
    id: "ID",
    name: "Nome",
    notes: "Note",
    status: "Stato",
    type: "Tipo"
  },
  new: "Nuova attività",
  newDescription: "Solo il nome è obbligatorio.",
  notFound: "Questa attività non esiste più.",
  noun: "attività",
  reopen: "Riapri",
  reopenDescription: "L'attività tornerà aperta e modificabile.",
  reopenTitle: "Riaprire {name}?",
  sections: {
    details: "Dati"
  },
  singular: "Attività",
  status: {
    closed: "Chiusa",
    open: "Aperta"
  },
  title: "Attività",
  type: {
    call: "Chiamata",
    email: "Email",
    meeting: "Riunione",
    task: "Compito"
  }
};
