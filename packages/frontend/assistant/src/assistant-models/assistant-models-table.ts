import type {
  AssistantModelSortField,
  AssistantModelFilterField,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import { type AssistantModelsMessageKey } from "./messages/index.ts";

/** Sort of the list without `?sort=`. */
export const ASSISTANT_MODELS_DEFAULT_SORT = { id: "id", desc: true };

/** A assistant models table's config: its path is always set (detail links use it). */
export type AssistantModelsTableConfig = DataTableConfig & { path: string };

export interface AssistantModelsTableOptions {
  /** Path of the app's assistant models list page, e.g. "/assistant-models". */
  path: string;
}

/**
 * The assistant models table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineAssistantModelsTable({
  path,
}: AssistantModelsTableOptions): AssistantModelsTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "modelId",
      "label",
      "supportsTools",
      "enabled",
      "createdAt",
      "updatedAt",
    ] satisfies AssistantModelSortField[],
    defaultSort: ASSISTANT_MODELS_DEFAULT_SORT,
    // { field: "…" satisfies AssistantModelFilterField, label: "…" satisfies AssistantModelsMessageKey }, added with the fields.
    filters: [
      {
        field: "id" satisfies AssistantModelFilterField,
        label: "assistantModels.fields.id" satisfies AssistantModelsMessageKey,
      },
      {
        field: "providerId" satisfies AssistantModelFilterField,
        label:
          "assistantModels.fields.providerId" satisfies AssistantModelsMessageKey,
      },
      {
        field: "modelId" satisfies AssistantModelFilterField,
        label:
          "assistantModels.fields.modelId" satisfies AssistantModelsMessageKey,
      },
      {
        field: "label" satisfies AssistantModelFilterField,
        label:
          "assistantModels.fields.label" satisfies AssistantModelsMessageKey,
      },
      {
        field: "supportsTools" satisfies AssistantModelFilterField,
        label:
          "assistantModels.fields.supportsTools" satisfies AssistantModelsMessageKey,
        options: [
          { value: "true", label: "common.yes" },
          { value: "false", label: "common.no" },
        ],
      },
      {
        field: "enabled" satisfies AssistantModelFilterField,
        label:
          "assistantModels.fields.enabled" satisfies AssistantModelsMessageKey,
        options: [
          { value: "true", label: "common.yes" },
          { value: "false", label: "common.no" },
        ],
      },
    ],
  });
  return { ...config, path };
}
