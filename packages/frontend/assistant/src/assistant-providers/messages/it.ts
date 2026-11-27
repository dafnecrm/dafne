import type { AssistantProvidersMessages } from "./en.ts";

/** AI provider texts in Italian: same keys as en.ts, checked by the type. */
export const it: AssistantProvidersMessages = {
  all: "Tutti i provider IA",
  check: {
    button: "Prova connessione",
    failed: "Non raggiungibile: {error}",
    models: "Id dei modelli che puoi usare",
    ok: "Connesso: {count} modelli disponibili",
  },
  create: "Crea provider IA",
  deleteDescription: "I suoi modelli non saranno più usabili dall'assistente.",
  editDescription: "Salvando si sostituiscono i dati del provider.",
  editMeta: "Modifica provider IA",
  empty: {
    filtered: "Nessun provider IA con {filter}.",
    none: "Aggiungi Anthropic o un Ollama locale per iniziare.",
    title: "Nessun provider IA trovato",
  },
  fields: {
    apiKeyEnv: "Variabile della chiave API",
    baseUrl: "URL del server",
    createdAt: "Aggiunto",
    enabled: "Attivo",
    id: "ID provider",
    kind: "Tipo",
    name: "Nome",
  },
  hints: {
    apiKeyEnv: "Il nome della variabile d'ambiente di sales-api con la chiave (es. ANTHROPIC_API_KEY): le chiavi non si salvano qui. Vuoto per un Ollama locale.",
    baseUrl: "Obbligatorio per i server compatibili OpenAI, es. http://localhost:11434/v1 per Ollama. Vuoto: quello del provider.",
  },
  kind: {
    anthropic: "Anthropic",
    openai: "OpenAI",
    "openai-compatible": "Compatibile OpenAI (Ollama, LM Studio…)",
  },
  new: "Nuovo provider IA",
  newDescription: "Dove girano i modelli dell'assistente: Anthropic, OpenAI o un vostro server (Ollama, LM Studio).",
  notFound: "Questo provider IA non esiste più.",
  noun: "provider IA",
  sections: { details: "Dettagli" },
  singular: "Provider IA",
  title: "Provider IA",
};
