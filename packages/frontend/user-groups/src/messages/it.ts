import type { UserGroupsMessages } from "./en.ts";

/** User group texts in Italian: same keys as en.ts, checked by the type. */
export const it: UserGroupsMessages = {
  title: "Gruppi di utenti",
  singular: "Gruppo di utenti",
  new: "Nuovo gruppo",
  all: "Tutti i gruppi",
  noun: "gruppi",
  create: "Crea gruppo",
  editMeta: "Modifica gruppo",
  newDescription: "Un gruppo di utenti, ad esempio chi può usare un agente IA.",
  editDescription: "Salvando si sostituiscono i dati e i membri del gruppo.",
  empty: {
    title: "Nessun gruppo trovato",
    filtered: "Nessun gruppo con {filter}.",
    none: "Aggiungi un gruppo, ad esempio Commerciali, per aprire gli agenti IA ai suoi membri.",
  },
  deleteDescription: "I suoi membri perdono ciò che il gruppo dava loro, ad esempio i suoi agenti IA.",
  notFound: "Questo gruppo non esiste più.",
  sections: { details: "Dettagli", members: "Membri", permissions: "Permessi" },
  fields: {
    createdAt: "Aggiunto",
    id: "ID gruppo",
    name: "Nome",
    description: "Descrizione",
    memberCount: "Membri",
    permissions: "Permessi",
    memberIds: "Membri",
  },
  permissions: {
    hint: "Cosa possono fare i suoi membri, oltre a leggere. Gli admin possono comunque fare tutto.",
    subjects: { Customer: "Clienti", Activity: "Attività", Product: "Prodotti", Uom: "Unità di misura", UomConversion: "Conversioni di unità", SalesOrder: "Ordini di vendita" },
    actions: { create: "Creare", update: "Modificare", delete: "Eliminare", close: "Chiudere / riaprire", changeStatus: "Cambiare stato" },
    selectAll: "Seleziona tutti",
    selectNone: "Deseleziona tutti",
  },
  allUsers: {
    badge: "Tutti gli utenti",
    hint: "Questo gruppo vale per ogni utente dell'app: i suoi permessi sono quelli di tutti.",
  },
  members: {
    search: "Cerca utenti per nome o email",
    none: "Ancora nessun membro",
    empty: "Nessun utente trovato",
  },
};
