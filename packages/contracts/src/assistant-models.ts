import { z } from "zod";
import {
  pageQuery,
  SORT_DIRECTIONS,
  requiredText,
  requiredId,
  type Page,
} from "./common.ts";
import { msg } from "./messages/index.ts";
import { assistantModelOptionsSchema, type AssistantModelOptions } from "./assistant.ts";

/* ---------- Requests ---------- */

/**
 * Body of POST /assistant-models and PUT /assistant-models/:id. PUT replaces the
 * whole assistant model: omitted optional fields are cleared.
 */
export const assistantModelBodySchema = z.strictObject({
  providerId: requiredId(msg("assistantModels.providerId.required")),
  modelId: requiredText(200, msg("assistantModels.modelId.required")),
  label: requiredText(200, msg("assistantModels.label.required")),
  supportsTools: z.boolean().optional(),
  options: assistantModelOptionsSchema,
  enabled: z.boolean().optional(),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type AssistantModelBodyInput = z.input<typeof assistantModelBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type AssistantModelBody = z.output<typeof assistantModelBodySchema>;

/** Assistant model fields the list can be sorted by. */
export const ASSISTANT_MODEL_SORT_FIELDS = [
  "id",
  "modelId",
  "label",
  "supportsTools",
  "enabled",
  "createdAt",
  "updatedAt",
] as const;
export type AssistantModelSortField =
  (typeof ASSISTANT_MODEL_SORT_FIELDS)[number];

/**
 * Assistant model fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id and the keys to other records match exactly).
 */
export const ASSISTANT_MODEL_FILTER_FIELDS = [
  "id",
  "providerId",
  "modelId",
  "label",
  "supportsTools",
  "enabled",
] as const;
export type AssistantModelFilterField =
  (typeof ASSISTANT_MODEL_FILTER_FIELDS)[number];

/** Query string of GET /assistant-models. Deleted assistant models are never listed. */
export const listAssistantModelsQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  providerId: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  modelId: z.string().max(200).optional(),
  label: z.string().max(200).optional(),
  supportsTools: z.enum(["true", "false"]).optional(),
  enabled: z.enum(["true", "false"]).optional(),
  /** Defaults to id. */
  sortBy: z.enum(ASSISTANT_MODEL_SORT_FIELDS).optional(),
  /** Defaults to desc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListAssistantModelsQuery = z.output<
  typeof listAssistantModelsQuerySchema
>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** An assistant model in GET /assistant-models. */
export interface ListedAssistantModel {
  id: number;
  providerId: number;
  modelId: string;
  label: string;
  supportsTools: boolean;
  options: AssistantModelOptions | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /assistant-models. */
export type AssistantModelsList = Page<ListedAssistantModel>;

/** A user who created or last updated an assistant model; null if since removed. */
export interface AssistantModelUser {
  id: string;
  name: string;
}

/** Response of GET /assistant-models/:id, POST /assistant-models and PUT /assistant-models/:id. */
export interface AssistantModelDetail extends ListedAssistantModel {
  createdBy: AssistantModelUser | null;
  updatedBy: AssistantModelUser | null;
  /** Always null: deleted assistant models aren't returned. */
  deletedAt: Date | null;
}
