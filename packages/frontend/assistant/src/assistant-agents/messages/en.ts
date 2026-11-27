/**
 * Assistant agent texts in English. The source of truth: it.ts must have the
 * same keys (AssistantAgentsMessages), and the apps merge them under
 * `assistantAgents`.
 */
export const en = {
  all: "All AI agents",
  audience: {
    all: "Everyone",
    everyone: "Every user of the app",
    groups: "Only the members of some groups",
    noGroups: "No groups: create them in User groups",
    pick: "Choose the groups",
  },
  create: "Create AI agent",
  deleteDescription: "Its conversations will be deleted too.",
  editDescription: "Saving replaces the agent's details.",
  editMeta: "Edit AI agent",
  empty: {
    filtered: "No AI agent where {filter}.",
    none: "Add an agent so users can talk to the assistant.",
    title: "No AI agents found",
  },
  fields: {
    allowModelOverride: "Users can pick another model",
    audience: "Who can use it",
    createdAt: "Added",
    defaultModelId: "Default model",
    description: "Description",
    enabled: "Enabled",
    groupIds: "Groups",
    id: "Agent ID",
    name: "Name",
    systemPrompt: "Instructions",
    tools: "Tools",
  },
  hints: {
    audience: "Super-admins can use every agent anyway.",
    systemPrompt: "Added to the assistant's own rules (use the tools, never invent data, writes only as proposals).",
    tools: "Reads run right away; proposals are written only when the user confirms them.",
  },
  new: "New AI agent",
  newDescription: "What users can ask the assistant: its instructions, its tools and its model.",
  noModel: "No model",
  notFound: "This AI agent no longer exists.",
  noun: "AI agents",
  sections: { audience: "Who can use it", details: "Details", tools: "Tools" },
  singular: "AI agent",
  title: "AI agents",
  toolGroups: { read: "Read", write: "Propose changes" },
  tools: {
    get_activity: "Read an activity",
    get_customer: "Read a customer",
    get_product: "Read a product",
    get_quotation: "Read a quotation",
    get_sales_order: "Read a sales order",
    list_activities: "List activities",
    list_products: "List products",
    list_quotations: "List quotations",
    list_sales_orders: "List sales orders",
    propose_change_sales_order_status: "Propose order status changes",
    propose_close_activity: "Propose closing activities",
    propose_create_activity: "Propose new activities",
    propose_create_customer: "Propose new customers",
    propose_create_quotation: "Propose new quotations",
    propose_create_sales_order: "Propose new sales orders",
    propose_update_customer: "Propose customer changes",
    search_customers: "Search customers",
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
