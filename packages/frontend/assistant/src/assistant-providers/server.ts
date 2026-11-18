import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { ASSISTANT_PROVIDERS_DEFAULT_SORT } from "./assistant-providers-table.ts";
import type {
  AssistantProviderDetail,
  AssistantProvidersList,
} from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /assistant-providers/:id. Throws a BackendError with
 * status 404 when the assistant provider doesn't exist or was deleted.
 */
export async function getAssistantProvider(
  id: string,
): Promise<AssistantProviderDetail> {
  const res = await backendFetch(
    `/assistant-providers/${encodeURIComponent(id)}`,
  );
  return res.json();
}

/** Calls the backend's GET /assistant-providers (deleted assistant providers are left out). */
export async function listAssistantProviders({
  limit,
  offset,
  filters = {},
  sort = ASSISTANT_PROVIDERS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<AssistantProvidersList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/assistant-providers?${query}`);
  return res.json();
}
