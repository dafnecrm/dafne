import { z } from 'zod';
import { msg } from './messages/index.ts';
import type { AssistantProviderKind } from './assistant-providers.ts';

/*
 * The AI assistant: the tools an agent may use, a model's options, and the
 * conversations (with the stream of events a message answers). Providers,
 * models and agents are resources of their own (assistant-providers.ts,
 * assistant-models.ts, assistant-agents.ts), managed by super-admins.
 */

/* ---------- Tools ---------- */

/** Tools that only read: they run right away. */
export const ASSISTANT_READ_TOOLS = [
  'search_customers',
  'get_customer',
  'list_sales_orders',
  'get_sales_order',
  'list_activities',
  'get_activity',
  'list_products',
  'get_product',
] as const;

/** Tools that write: they only propose an action, which the user confirms. */
export const ASSISTANT_WRITE_TOOLS = [
  'propose_create_customer',
  'propose_update_customer',
  'propose_create_activity',
  'propose_close_activity',
  'propose_change_sales_order_status',
  'propose_create_sales_order',
] as const;

export const ASSISTANT_TOOL_NAMES = [...ASSISTANT_READ_TOOLS, ...ASSISTANT_WRITE_TOOLS] as const;
export type AssistantToolName = (typeof ASSISTANT_TOOL_NAMES)[number];

/** An agent's tools: known names, no repeats. */
export const assistantToolsSchema = z
  .array(z.enum(ASSISTANT_TOOL_NAMES, { error: msg('assistant.tools.unknown') }))
  .max(ASSISTANT_TOOL_NAMES.length)
  .nullish()
  .transform((tools) => [...new Set(tools ?? [])]);

/* ---------- Model options ---------- */

/**
 * How much the model reasons before answering, for every provider (the AI
 * SDK maps it: effort on Anthropic, reasoning_effort on OpenAI and
 * OpenAI-compatible servers such as Ollama). `none` turns it off where the
 * model allows it (e.g. qwen3), which is much faster on local machines.
 */
export const ASSISTANT_REASONING_LEVELS = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type AssistantReasoningLevel = (typeof ASSISTANT_REASONING_LEVELS)[number];

/** A model's options; the provider's default for each one left out. */
export const assistantModelOptionsSchema = z
  .strictObject({
    reasoning: z.enum(ASSISTANT_REASONING_LEVELS).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.int().min(256).max(128_000).optional(),
  })
  .nullish()
  .transform((options) => options ?? null);
export type AssistantModelOptions = NonNullable<z.output<typeof assistantModelOptionsSchema>>;

/* ---------- Conversations ---------- */

/** Body of POST /assistant/conversations. */
export const createConversationBodySchema = z.strictObject({
  agentId: z.int().positive({ error: msg('assistant.agent.required') }),
  /** Defaults to the agent's model; another only if the agent allows it. */
  modelId: z.int().positive().nullish(),
});
export type CreateConversationBody = z.output<typeof createConversationBodySchema>;

/** Body of PATCH /assistant/conversations/:id: switch the model. */
export const updateConversationBodySchema = z.strictObject({
  modelId: z.int().positive({ error: msg('assistant.model.required') }),
});
export type UpdateConversationBody = z.output<typeof updateConversationBodySchema>;

/** Body of POST /assistant/conversations/:id/messages. */
export const assistantMessageBodySchema = z.strictObject({
  text: z
    .string()
    .trim()
    .min(1, { error: msg('assistant.message.required') })
    .max(4000, { error: msg('assistant.message.tooLong') }),
});
export type AssistantMessageBody = z.output<typeof assistantMessageBodySchema>;

/* ---------- Responses ---------- */

/** A model a user can pick, in GET /assistant/agents. */
export interface AvailableAssistantModel {
  id: number;
  label: string;
  modelId: string;
  providerKind: AssistantProviderKind;
  providerName: string;
  /** Runs on the company's own machines (an OpenAI-compatible server). */
  local: boolean;
}

/** An agent a user can talk to, in GET /assistant/agents. */
export interface AvailableAssistantAgent {
  id: number;
  name: string;
  description: string | null;
  defaultModelId: number | null;
  allowModelOverride: boolean;
  /** The models this agent can use: all enabled ones if it allows switching. */
  models: AvailableAssistantModel[];
}

export const ASSISTANT_ACTION_STATUSES = ['pending', 'confirmed', 'rejected', 'failed'] as const;
export type AssistantActionStatus = (typeof ASSISTANT_ACTION_STATUSES)[number];

/** A write the assistant proposed, waiting for (or past) the user's decision. */
export interface AssistantAction {
  id: number;
  conversationId: number;
  kind: AssistantToolName;
  /** The validated body the action will be run with. */
  payload: Record<string, unknown>;
  status: AssistantActionStatus;
  /** What the write gave back (e.g. `{ id }` of the record) or the error. */
  result: { resource?: string; id?: number; error?: string } | null;
  createdAt: Date;
  decidedAt: Date | null;
}

/** A conversation in GET /assistant/conversations. */
export interface AssistantConversation {
  id: number;
  title: string | null;
  agentId: number;
  modelId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A message as the UI shows it (tool calls folded into `tools`). */
export interface AssistantChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  /** Labels of the tools the assistant used for this answer. */
  tools: AssistantToolName[];
  createdAt: Date;
}

/** Response of GET /assistant/conversations/:id. */
export interface AssistantConversationDetail extends AssistantConversation {
  messages: AssistantChatMessage[];
  actions: AssistantAction[];
}

/**
 * Events of POST /assistant/conversations/:id/messages (server-sent events,
 * one JSON object per `data:` line).
 */
export type AssistantStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: AssistantToolName }
  | { type: 'action'; action: AssistantAction }
  | { type: 'done'; messageId: number | null }
  | { type: 'error'; message: string };
