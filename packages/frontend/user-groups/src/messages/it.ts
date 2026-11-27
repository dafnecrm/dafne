import type { UserGroupsMessages } from "./en.ts";

/** User group texts in Italian: same keys as en.ts, checked by the type. */
export const it: UserGroupsMessages = {
  all: "Tutti i gruppi",
  allUsers: {
    badge: "Tutti gli utenti",
    hint: "Questo gruppo vale per ogni utente dell'app: i suoi permessi sono quelli di tutti.",
  },
  create: "Crea gruppo",
  deleteDescription: "I suoi membri perdono ciò che il gruppo dava loro, ad esempio i suoi agenti IA.",
  editDescription: "Salvando si sostituiscono i dati e i membri del gruppo.",
  editMeta: "Modifica gruppo",
  empty: {
    filtered: "Nessun gruppo con {filter}.",
    none: "Aggiungi un gruppo, ad esempio Commerciali, per aprire gli agenti IA ai suoi membri.",
    title: "Nessun gruppo trovato",
  },
  fields: {
    createdAt: "Aggiunto",
    description: "Descrizione",
    id: "ID gruppo",
    memberCount: "Membri",
    memberIds: "Membri",
    name: "Nome",
    permissions: "Permessi",
  },
  members: {
    empty: "Nessun utente trovato",
    none: "Ancora nessun membro",
    search: "Cerca utenti per nome o email",
  },
  new: "Nuovo gruppo",
  newDescription: "Un gruppo di utenti, ad esempio chi può usare un agente IA.",
  notFound: "Questo gruppo non esiste più.",
  noun: "gruppi",
  permissions: {
    actions: { changeStatus: "Cambiare stato", close: "Chiudere / riaprire", create: "Creare", delete: "Eliminare", update: "Modificare" },
    hint: "Cosa possono fare i suoi membri, oltre a leggere. Gli admin possono comunque fare tutto.",
    selectAll: "Seleziona tutti",
    selectNone: "Deseleziona tutti",
    subjects: { Activity: "Attività", Customer: "Clienti", DocumentTemplate: "Modelli di documento", Product: "Prodotti", Quotation: "Offerte", SalesOrder: "Ordini di vendita", Uom: "Unità di misura", UomConversion: "Conversioni di unità" },
  },
  sections: { details: "Dettagli", members: "Membri", permissions: "Permessi" },
  singular: "Gruppo utenti",
  title: "Gruppi utenti",
};
