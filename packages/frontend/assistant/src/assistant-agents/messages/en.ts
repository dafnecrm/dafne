/**
 * Assistant agent texts in English. The source of truth: it.ts must have the
 * same keys (AssistantAgentsMessages), and the apps merge them under
 * `assistantAgents`.
 */
export const en = {
  title: "AI agents",
  singular: "AI agent",
  new: "New AI agent",
  all: "All AI agents",
  noun: "AI agents",
  create: "Create AI agent",
  editMeta: "Edit AI agent",
  newDescription: "What users can ask the assistant: its instructions, its tools and its model.",
  editDescription: "Saving replaces the agent's details.",
  empty: {
    title: "No AI agents found",
    filtered: "No AI agent where {filter}.",
    none: "Add an agent so users can talk to the assistant.",
  },
  deleteDescription: "Its conversations will be deleted too.",
  notFound: "This AI agent no longer exists.",
  sections: { details: "Details", tools: "Tools", audience: "Who can use it" },
  fields: {
    createdAt: "Added",
    id: "Agent ID",
    name: "Name",
    description: "Description",
    systemPrompt: "Instructions",
    tools: "Tools",
    defaultModelId: "Default model",
    allowModelOverride: "Users can pick another model",
    enabled: "Enabled",
    groupIds: "Groups",
    audience: "Who can use it",
  },
  hints: {
    audience: "Super-admins can use every agent anyway.",
    systemPrompt: "Added to the assistant's own rules (use the tools, never invent data, writes only as proposals).",
    tools: "Reads run right away; proposals are written only when the user confirms them.",
  },
  audience: {
    everyone: "Every user of the app",
    groups: "Only the members of some groups",
    pick: "Choose the groups",
    noGroups: "No groups: create them in User groups",
    all: "Everyone",
  },
  noModel: "No model",
  toolGroups: { read: "Read", write: "Propose changes" },
  tools: {
    search_customers: "Search customers",
    get_customer: "Read a customer",
    list_sales_orders: "List sales orders",
    get_sales_order: "Read a sales order",
    list_activities: "List activities",
    get_activity: "Read an activity",
    list_products: "List products",
    get_product: "Read a product",
    propose_create_customer: "Propose new customers",
    propose_update_customer: "Propose customer changes",
    propose_create_activity: "Propose new activities",
    propose_close_activity: "Propose closing activities",
    propose_change_sales_order_status: "Propose order status changes",
    propose_create_sales_order: "Propose new sales orders",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type AssistantAgentsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "assistantAgents.fields.id". */
export type AssistantAgentsMessageKey =
  `assistantAgents.${Paths<AssistantAgentsMessages>}`;
