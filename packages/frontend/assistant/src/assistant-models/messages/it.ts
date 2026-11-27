import type { AssistantModelsMessages } from "./en.ts";

/** AI model texts in Italian: same keys as en.ts, checked by the type. */
export const it: AssistantModelsMessages = {
  all: "Tutti i modelli IA",
  create: "Crea modello IA",
  deleteDescription: "Gli agenti e le conversazioni che lo usano avranno bisogno di un altro modello.",
  editDescription: "Salvando si sostituiscono i dati del modello.",
  editMeta: "Modifica modello IA",
  empty: {
    filtered: "Nessun modello IA con {filter}.",
    none: "Aggiungi un modello di uno dei tuoi provider.",
    title: "Nessun modello IA trovato",
  },
  fields: {
    createdAt: "Aggiunto",
    enabled: "Attivo",
    id: "ID modello",
    label: "Etichetta",
    modelId: "Id del modello",
    providerId: "Provider",
    reasoning: "Ragionamento",
    supportsTools: "Sa usare gli strumenti",
    temperature: "Temperatura",
  },
  hints: {
    modelId: "Come lo chiama il provider, es. claude-opus-5-5 o qwen3:8b (Prova connessione sul provider li elenca).",
    reasoning: "Spento è molto più veloce sui modelli locali.",
    supportsTools: "Agli utenti si offrono solo i modelli che sanno usare gli strumenti.",
    temperature: "0–2; vuoto: quella del modello.",
  },
  new: "Nuovo modello IA",
  newDescription: "Un modello di un provider, che gli agenti possono usare.",
  notFound: "Questo modello IA non esiste più.",
  noun: "modelli IA",
  reasoning: {
    default: "Predefinito del modello",
    high: "Alto",
    low: "Basso",
    max: "Massimo",
    medium: "Medio",
    none: "Spento",
    xhigh: "Molto alto",
  },
  sections: { details: "Dettagli", options: "Opzioni" },
  singular: "Modello IA",
  title: "Modelli IA",
};
