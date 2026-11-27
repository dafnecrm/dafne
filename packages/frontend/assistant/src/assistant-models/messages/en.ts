/**
 * Assistant model texts in English. The source of truth: it.ts must have the
 * same keys (AssistantModelsMessages), and the apps merge them under
 * `assistantModels`.
 */
export const en = {
  all: "All AI models",
  create: "Create AI model",
  deleteDescription: "Agents and conversations using it will need another model.",
  editDescription: "Saving replaces the model's details.",
  editMeta: "Edit AI model",
  empty: {
    filtered: "No AI model where {filter}.",
    none: "Add a model of one of your providers.",
    title: "No AI models found",
  },
  fields: {
    createdAt: "Added",
    enabled: "Enabled",
    id: "Model ID",
    label: "Label",
    modelId: "Model id",
    providerId: "Provider",
    reasoning: "Reasoning",
    supportsTools: "Can call tools",
    temperature: "Temperature",
  },
  hints: {
    modelId: "As the provider names it, e.g. claude-opus-5-5 or qwen3:8b (Test connection on the provider lists them).",
    reasoning: "Off is much faster on local models.",
    supportsTools: "Only models that can call tools are offered to users.",
    temperature: "0–2; empty: the model's default.",
  },
  new: "New AI model",
  newDescription: "A model of a provider that the agents can use.",
  notFound: "This AI model no longer exists.",
  noun: "AI models",
  reasoning: {
    default: "Model default",
    high: "High",
    low: "Low",
    max: "Max",
    medium: "Medium",
    none: "Off",
    xhigh: "Very high",
  },
  sections: { details: "Details", options: "Options" },
  singular: "AI model",
  title: "AI models",
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
