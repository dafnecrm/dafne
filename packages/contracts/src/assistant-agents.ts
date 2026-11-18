import { z } from "zod";
import {
  pageQuery,
  SORT_DIRECTIONS,
  requiredText,
  optionalText,
  optionalId,
  type Page,
} from "./common.ts";
import { msg } from "./messages/index.ts";
import { assistantToolsSchema, type AssistantToolName } from "./assistant.ts";

/* ---------- Requests ---------- */

/**
 * Body of POST /assistant-agents and PUT /assistant-agents/:id. PUT replaces the
 * whole assistant agent: omitted optional fields are cleared.
 */
/** Who can use an agent: every user of the app, or the members of its groups. */
export const ASSISTANT_AGENT_AUDIENCES = ["everyone", "groups"] as const;
export type AssistantAgentAudience = (typeof ASSISTANT_AGENT_AUDIENCES)[number];

export const assistantAgentBodySchema = z.strictObject({
  name: requiredText(100, msg("assistantAgents.name.required")),
  description: optionalText(z.string().max(65535)),
  systemPrompt: requiredText(
    65535,
    msg("assistantAgents.systemPrompt.required"),
  ),
  tools: assistantToolsSchema,
  defaultModelId: optionalId(msg("assistantAgents.defaultModelId.required")),
  allowModelOverride: z.boolean().optional(),
  enabled: z.boolean().optional(),
  /** Defaults to everyone. Super-admins can use every agent anyway. */
  audience: z.enum(ASSISTANT_AGENT_AUDIENCES).optional(),
  /** With audience "groups": the user groups it's open to (ignored otherwise). */
  groupIds: z
    .array(z.int().positive())
    .max(100)
    .nullish()
    .transform((ids) => [...new Set(ids ?? [])]),
}).refine((body) => body.audience !== "groups" || body.groupIds.length > 0, {
  path: ["groupIds"],
  error: msg("assistantAgents.groupIds.required"),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type AssistantAgentBodyInput = z.input<typeof assistantAgentBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type AssistantAgentBody = z.output<typeof assistantAgentBodySchema>;

/** Assistant agent fields the list can be sorted by. */
export const ASSISTANT_AGENT_SORT_FIELDS = [
  "id",
  "name",
  "description",
  "systemPrompt",
  "allowModelOverride",
  "enabled",
  "createdAt",
  "updatedAt",
] as const;
export type AssistantAgentSortField =
  (typeof ASSISTANT_AGENT_SORT_FIELDS)[number];

/**
 * Assistant agent fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id and the keys to other records match exactly).
 */
export const ASSISTANT_AGENT_FILTER_FIELDS = [
  "id",
  "name",
  "description",
  "systemPrompt",
  "defaultModelId",
  "allowModelOverride",
  "enabled",
] as const;
export type AssistantAgentFilterField =
  (typeof ASSISTANT_AGENT_FILTER_FIELDS)[number];

/** Query string of GET /assistant-agents. Deleted assistant agents are never listed. */
export const listAssistantAgentsQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  name: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
  systemPrompt: z.string().max(255).optional(),
  defaultModelId: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  allowModelOverride: z.enum(["true", "false"]).optional(),
  enabled: z.enum(["true", "false"]).optional(),
  /** Defaults to id. */
  sortBy: z.enum(ASSISTANT_AGENT_SORT_FIELDS).optional(),
  /** Defaults to desc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListAssistantAgentsQuery = z.output<
  typeof listAssistantAgentsQuerySchema
>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** An assistant agent in GET /assistant-agents. */
export interface ListedAssistantAgent {
  id: number;
  name: string;
  description: string | null;
  systemPrompt: string;
  tools: AssistantToolName[];
  defaultModelId: number | null;
  allowModelOverride: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  audience: AssistantAgentAudience;
  /** With audience "groups": its groups, by name. */
  groups: { id: number; name: string }[];
}

/** Response of GET /assistant-agents. */
export type AssistantAgentsList = Page<ListedAssistantAgent>;

/** A user who created or last updated an assistant agent; null if since removed. */
export interface AssistantAgentUser {
  id: string;
  name: string;
}

/** Response of GET /assistant-agents/:id, POST /assistant-agents and PUT /assistant-agents/:id. */
export interface AssistantAgentDetail extends ListedAssistantAgent {
  createdBy: AssistantAgentUser | null;
  updatedBy: AssistantAgentUser | null;
  /** Always null: deleted assistant agents aren't returned. */
  deletedAt: Date | null;
}
