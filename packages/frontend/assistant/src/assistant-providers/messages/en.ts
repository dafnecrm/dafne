/**
 * Assistant provider texts in English. The source of truth: it.ts must have the
 * same keys (AssistantProvidersMessages), and the apps merge them under
 * `assistantProviders`.
 */
export const en = {
  all: "All AI providers",
  check: {
    button: "Test connection",
    failed: "Not reachable: {error}",
    models: "Model ids you can use",
    ok: "Connected: {count} models available",
  },
  create: "Create AI provider",
  deleteDescription: "Its models will no longer be usable by the assistant.",
  editDescription: "Saving replaces the provider's details.",
  editMeta: "Edit AI provider",
  empty: {
    filtered: "No AI provider where {filter}.",
    none: "Add Anthropic or a local Ollama to get started.",
    title: "No AI providers found",
  },
  fields: {
    apiKeyEnv: "API key variable",
    baseUrl: "Server URL",
    createdAt: "Added",
    enabled: "Enabled",
    id: "Provider ID",
    kind: "Kind",
    name: "Name",
  },
  hints: {
    apiKeyEnv: "The name of the environment variable of sales-api holding the key (e.g. ANTHROPIC_API_KEY): keys are never saved here. Empty for a local Ollama.",
    baseUrl: "Required for OpenAI-compatible servers, e.g. http://localhost:11434/v1 for Ollama. Empty: the provider's own.",
  },
  kind: {
    anthropic: "Anthropic",
    openai: "OpenAI",
    "openai-compatible": "OpenAI-compatible (Ollama, LM Studio…)",
  },
  new: "New AI provider",
  newDescription: "Where the assistant's models run: Anthropic, OpenAI, or a server of your own (Ollama, LM Studio).",
  notFound: "This AI provider no longer exists.",
  noun: "AI providers",
  sections: { details: "Details" },
  singular: "AI provider",
  title: "AI providers",
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
