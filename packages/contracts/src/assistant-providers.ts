import { z } from "zod";
import {
  pageQuery,
  SORT_DIRECTIONS,
  requiredText,
  optionalText,
  type Page,
} from "./common.ts";
import { msg } from "./messages/index.ts";

/* ---------- Requests ---------- */

/** Values of assistant provider kind. */
export const ASSISTANT_PROVIDER_KINDS = [
  "anthropic",
  "openai",
  "openai-compatible",
] as const;
export type AssistantProviderKind = (typeof ASSISTANT_PROVIDER_KINDS)[number];

/**
 * Body of POST /assistant-providers and PUT /assistant-providers/:id. PUT replaces the
 * whole assistant provider: omitted optional fields are cleared.
 */
export const assistantProviderBodySchema = z
  .strictObject({
    name: requiredText(100, msg("assistantProviders.name.required")),
    kind: z.enum(ASSISTANT_PROVIDER_KINDS, {
      error: msg("assistantProviders.kind.required"),
    }),
    /** The server's API root, e.g. http://localhost:11434/v1 for Ollama. */
    baseUrl: optionalText(
      z
        .string()
        .max(500)
        .regex(/^https?:\/\/\S+$/, {
          error: msg("assistantProviders.baseUrl.invalid"),
        }),
    ),
    /**
     * The name of the env var of sales-api that holds the API key (e.g.
     * ANTHROPIC_API_KEY): keys are never stored in the database.
     */
    apiKeyEnv: optionalText(
      z
        .string()
        .max(100)
        .regex(/^[A-Z][A-Z0-9_]*$/, {
          error: msg("assistantProviders.apiKeyEnv.invalid"),
        }),
    ),
    enabled: z.boolean().optional(),
  })
  .refine((body) => body.kind !== "openai-compatible" || body.baseUrl, {
    path: ["baseUrl"],
    error: msg("assistantProviders.baseUrl.required"),
  });

/** What a client sends: blank optional fields may be "", null or missing. */
export type AssistantProviderBodyInput = z.input<
  typeof assistantProviderBodySchema
>;
/** What the backend gets after validation: blanks are null. */
export type AssistantProviderBody = z.output<
  typeof assistantProviderBodySchema
>;

/** Assistant provider fields the list can be sorted by. */
export const ASSISTANT_PROVIDER_SORT_FIELDS = [
  "id",
  "name",
  "kind",
  "baseUrl",
  "apiKeyEnv",
  "enabled",
  "createdAt",
  "updatedAt",
] as const;
export type AssistantProviderSortField =
  (typeof ASSISTANT_PROVIDER_SORT_FIELDS)[number];

/**
 * Assistant provider fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id and the keys to other records match exactly).
 */
export const ASSISTANT_PROVIDER_FILTER_FIELDS = [
  "id",
  "name",
  "kind",
  "baseUrl",
  "apiKeyEnv",
  "enabled",
] as const;
export type AssistantProviderFilterField =
  (typeof ASSISTANT_PROVIDER_FILTER_FIELDS)[number];

/** Query string of GET /assistant-providers. Deleted assistant providers are never listed. */
export const listAssistantProvidersQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  name: z.string().max(100).optional(),
  kind: z.enum(ASSISTANT_PROVIDER_KINDS).optional(),
  baseUrl: z.string().max(500).optional(),
  apiKeyEnv: z.string().max(100).optional(),
  enabled: z.enum(["true", "false"]).optional(),
  /** Defaults to id. */
  sortBy: z.enum(ASSISTANT_PROVIDER_SORT_FIELDS).optional(),
  /** Defaults to desc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListAssistantProvidersQuery = z.output<
  typeof listAssistantProvidersQuerySchema
>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** An assistant provider in GET /assistant-providers. */
export interface ListedAssistantProvider {
  id: number;
  name: string;
  kind: AssistantProviderKind;
  baseUrl: string | null;
  apiKeyEnv: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /assistant-providers. */
export type AssistantProvidersList = Page<ListedAssistantProvider>;

/** A user who created or last updated an assistant provider; null if since removed. */
export interface AssistantProviderUser {
  id: string;
  name: string;
}

/** Response of GET /assistant-providers/:id, POST /assistant-providers and PUT /assistant-providers/:id. */
export interface AssistantProviderDetail extends ListedAssistantProvider {
  createdBy: AssistantProviderUser | null;
  updatedBy: AssistantProviderUser | null;
  /** Always null: deleted assistant providers aren't returned. */
  deletedAt: Date | null;
}

/** Response of POST /assistant-providers/:id/check. */
export interface AssistantProviderCheck {
  ok: boolean;
  /** The ids the provider offers (e.g. qwen3:8b on Ollama). */
  models: string[];
  error?: string;
}
