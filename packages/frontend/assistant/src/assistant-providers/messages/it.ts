import type { AssistantProvidersMessages } from "./en.ts";

/** AI provider texts in Italian: same keys as en.ts, checked by the type. */
export const it: AssistantProvidersMessages = {
  title: "Provider IA",
  singular: "Provider IA",
  new: "Nuovo provider IA",
  all: "Tutti i provider IA",
  noun: "provider IA",
  create: "Crea provider IA",
  editMeta: "Modifica provider IA",
  newDescription: "Dove girano i modelli dell'assistente: Anthropic, OpenAI o un vostro server (Ollama, LM Studio).",
  editDescription: "Salvando si sostituiscono i dati del provider.",
  empty: {
    title: "Nessun provider IA trovato",
    filtered: "Nessun provider IA con {filter}.",
    none: "Aggiungi Anthropic o un Ollama locale per iniziare.",
  },
  deleteDescription: "I suoi modelli non saranno più usabili dall'assistente.",
  notFound: "Questo provider IA non esiste più.",
  sections: { details: "Dettagli" },
  fields: {
    createdAt: "Aggiunto",
    id: "ID provider",
    name: "Nome",
    kind: "Tipo",
    baseUrl: "URL del server",
    apiKeyEnv: "Variabile della chiave API",
    enabled: "Attivo",
  },
  hints: {
    baseUrl: "Obbligatorio per i server compatibili OpenAI, es. http://localhost:11434/v1 per Ollama. Vuoto: quello del provider.",
    apiKeyEnv: "Il nome della variabile d'ambiente di sales-api con la chiave (es. ANTHROPIC_API_KEY): le chiavi non si salvano qui. Vuoto per un Ollama locale.",
  },
  kind: {
    anthropic: "Anthropic",
    openai: "OpenAI",
    "openai-compatible": "Compatibile OpenAI (Ollama, LM Studio…)",
  },
  check: {
    button: "Prova connessione",
    ok: "Connesso: {count} modelli disponibili",
    failed: "Non raggiungibile: {error}",
    models: "Id dei modelli che puoi usare",
  },
};
