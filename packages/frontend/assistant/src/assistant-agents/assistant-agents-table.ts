import type {
  AssistantAgentSortField,
  AssistantAgentFilterField,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import { type AssistantAgentsMessageKey } from "./messages/index.ts";

/** Sort of the list without `?sort=`. */
export const ASSISTANT_AGENTS_DEFAULT_SORT = { id: "id", desc: true };

/** A assistant agents table's config: its path is always set (detail links use it). */
export type AssistantAgentsTableConfig = DataTableConfig & { path: string };

export interface AssistantAgentsTableOptions {
  /** Path of the app's assistant agents list page, e.g. "/assistant-agents". */
  path: string;
}

/**
 * The assistant agents table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineAssistantAgentsTable({
  path,
}: AssistantAgentsTableOptions): AssistantAgentsTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "name",
      "description",
      "allowModelOverride",
      "enabled",
      "createdAt",
      "updatedAt",
    ] satisfies AssistantAgentSortField[],
    defaultSort: ASSISTANT_AGENTS_DEFAULT_SORT,
    // { field: "…" satisfies AssistantAgentFilterField, label: "…" satisfies AssistantAgentsMessageKey }, added with the fields.
    filters: [
      {
        field: "id" satisfies AssistantAgentFilterField,
        label: "assistantAgents.fields.id" satisfies AssistantAgentsMessageKey,
      },
      {
        field: "name" satisfies AssistantAgentFilterField,
        label:
          "assistantAgents.fields.name" satisfies AssistantAgentsMessageKey,
      },
      {
        field: "description" satisfies AssistantAgentFilterField,
        label:
          "assistantAgents.fields.description" satisfies AssistantAgentsMessageKey,
      },
      {
        field: "systemPrompt" satisfies AssistantAgentFilterField,
        label:
          "assistantAgents.fields.systemPrompt" satisfies AssistantAgentsMessageKey,
      },
      {
        field: "defaultModelId" satisfies AssistantAgentFilterField,
        label:
          "assistantAgents.fields.defaultModelId" satisfies AssistantAgentsMessageKey,
      },
      {
        field: "allowModelOverride" satisfies AssistantAgentFilterField,
        label:
          "assistantAgents.fields.allowModelOverride" satisfies AssistantAgentsMessageKey,
        options: [
          { value: "true", label: "common.yes" },
          { value: "false", label: "common.no" },
        ],
      },
      {
        field: "enabled" satisfies AssistantAgentFilterField,
        label:
          "assistantAgents.fields.enabled" satisfies AssistantAgentsMessageKey,
        options: [
          { value: "true", label: "common.yes" },
          { value: "false", label: "common.no" },
        ],
      },
    ],
  });
  return { ...config, path };
}
