/**
 * Assistant provider texts in English. The source of truth: it.ts must have the
 * same keys (AssistantProvidersMessages), and the apps merge them under
 * `assistantProviders`.
 */
export const en = {
  title: "AI providers",
  singular: "AI provider",
  new: "New AI provider",
  all: "All AI providers",
  noun: "AI providers",
  create: "Create AI provider",
  editMeta: "Edit AI provider",
  newDescription: "Where the assistant's models run: Anthropic, OpenAI, or a server of your own (Ollama, LM Studio).",
  editDescription: "Saving replaces the provider's details.",
  empty: {
    title: "No AI providers found",
    filtered: "No AI provider where {filter}.",
    none: "Add Anthropic or a local Ollama to get started.",
  },
  deleteDescription: "Its models will no longer be usable by the assistant.",
  notFound: "This AI provider no longer exists.",
  sections: { details: "Details" },
  fields: {
    createdAt: "Added",
    id: "Provider ID",
    name: "Name",
    kind: "Kind",
    baseUrl: "Server URL",
    apiKeyEnv: "API key variable",
    enabled: "Enabled",
  },
  hints: {
    baseUrl: "Required for OpenAI-compatible servers, e.g. http://localhost:11434/v1 for Ollama. Empty: the provider's own.",
    apiKeyEnv: "The name of the environment variable of sales-api holding the key (e.g. ANTHROPIC_API_KEY): keys are never saved here. Empty for a local Ollama.",
  },
  kind: {
    anthropic: "Anthropic",
    openai: "OpenAI",
    "openai-compatible": "OpenAI-compatible (Ollama, LM Studio…)",
  },
  check: {
    button: "Test connection",
    ok: "Connected: {count} models available",
    failed: "Not reachable: {error}",
    models: "Model ids you can use",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type AssistantProvidersMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "assistantProviders.fields.id". */
export type AssistantProvidersMessageKey =
  `assistantProviders.${Paths<AssistantProvidersMessages>}`;
