import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { ASSISTANT_MODELS_DEFAULT_SORT } from "./assistant-models-table.ts";
import type { AssistantModelDetail, AssistantModelsList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /assistant-models/:id. Throws a BackendError with
 * status 404 when the assistant model doesn't exist or was deleted.
 */
export async function getAssistantModel(
  id: string,
): Promise<AssistantModelDetail> {
  const res = await backendFetch(`/assistant-models/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /assistant-models (deleted assistant models are left out). */
export async function listAssistantModels({
  limit,
  offset,
  filters = {},
  sort = ASSISTANT_MODELS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<AssistantModelsList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/assistant-models?${query}`);
  return res.json();
}
