import type {
  AssistantProviderSortField,
  AssistantProviderKind,
  AssistantProviderFilterField,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import { type AssistantProvidersMessageKey } from "./messages/index.ts";

/** Labels (message keys) of the kind values. */
export const ASSISTANT_PROVIDER_KIND_OPTIONS = [
  { value: "anthropic", label: "assistantProviders.kind.anthropic" },
  { value: "openai", label: "assistantProviders.kind.openai" },
  {
    value: "openai-compatible",
    label: "assistantProviders.kind.openai-compatible",
  },
] satisfies {
  value: AssistantProviderKind;
  label: AssistantProvidersMessageKey;
}[];

/** Sort of the list without `?sort=`. */
export const ASSISTANT_PROVIDERS_DEFAULT_SORT = { id: "id", desc: true };

/** A assistant providers table's config: its path is always set (detail links use it). */
export type AssistantProvidersTableConfig = DataTableConfig & { path: string };

export interface AssistantProvidersTableOptions {
  /** Path of the app's assistant providers list page, e.g. "/assistant-providers". */
  path: string;
}

/**
 * The assistant providers table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineAssistantProvidersTable({
  path,
}: AssistantProvidersTableOptions): AssistantProvidersTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "name",
      "kind",
      "baseUrl",
      "apiKeyEnv",
      "enabled",
      "createdAt",
      "updatedAt",
    ] satisfies AssistantProviderSortField[],
    defaultSort: ASSISTANT_PROVIDERS_DEFAULT_SORT,
    // { field: "…" satisfies AssistantProviderFilterField, label: "…" satisfies AssistantProvidersMessageKey }, added with the fields.
    filters: [
      {
        field: "id" satisfies AssistantProviderFilterField,
        label:
          "assistantProviders.fields.id" satisfies AssistantProvidersMessageKey,
      },
      {
        field: "name" satisfies AssistantProviderFilterField,
        label:
          "assistantProviders.fields.name" satisfies AssistantProvidersMessageKey,
      },
      {
        field: "kind" satisfies AssistantProviderFilterField,
        label:
          "assistantProviders.fields.kind" satisfies AssistantProvidersMessageKey,
        options: ASSISTANT_PROVIDER_KIND_OPTIONS,
      },
      {
        field: "baseUrl" satisfies AssistantProviderFilterField,
        label:
          "assistantProviders.fields.baseUrl" satisfies AssistantProvidersMessageKey,
      },
      {
        field: "apiKeyEnv" satisfies AssistantProviderFilterField,
        label:
          "assistantProviders.fields.apiKeyEnv" satisfies AssistantProvidersMessageKey,
      },
      {
        field: "enabled" satisfies AssistantProviderFilterField,
        label:
          "assistantProviders.fields.enabled" satisfies AssistantProvidersMessageKey,
        options: [
          { value: "true", label: "common.yes" },
          { value: "false", label: "common.no" },
        ],
      },
    ],
  });
  return { ...config, path };
}
