/**
 * Assistant model texts in English. The source of truth: it.ts must have the
 * same keys (AssistantModelsMessages), and the apps merge them under
 * `assistantModels`.
 */
export const en = {
  title: "AI models",
  singular: "AI model",
  new: "New AI model",
  all: "All AI models",
  noun: "AI models",
  create: "Create AI model",
  editMeta: "Edit AI model",
  newDescription: "A model of a provider that the agents can use.",
  editDescription: "Saving replaces the model's details.",
  empty: {
    title: "No AI models found",
    filtered: "No AI model where {filter}.",
    none: "Add a model of one of your providers.",
  },
  deleteDescription: "Agents and conversations using it will need another model.",
  notFound: "This AI model no longer exists.",
  sections: { details: "Details", options: "Options" },
  fields: {
    createdAt: "Added",
    id: "Model ID",
    providerId: "Provider",
    modelId: "Model id",
    label: "Label",
    supportsTools: "Can call tools",
    enabled: "Enabled",
    reasoning: "Reasoning",
    temperature: "Temperature",
  },
  hints: {
    modelId: "As the provider names it, e.g. claude-opus-5-5 or qwen3:8b (Test connection on the provider lists them).",
    supportsTools: "Only models that can call tools are offered to users.",
    reasoning: "Off is much faster on local models.",
    temperature: "0–2; empty: the model's default.",
  },
  reasoning: {
    default: "Model default",
    none: "Off",
    low: "Low",
    medium: "Medium",
    high: "High",
    xhigh: "Very high",
    max: "Max",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type AssistantModelsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "assistantModels.fields.id". */
export type AssistantModelsMessageKey =
  `assistantModels.${Paths<AssistantModelsMessages>}`;
