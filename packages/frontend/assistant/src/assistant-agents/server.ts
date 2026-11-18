import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { ASSISTANT_AGENTS_DEFAULT_SORT } from "./assistant-agents-table.ts";
import type { AssistantAgentDetail, AssistantAgentsList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /assistant-agents/:id. Throws a BackendError with
 * status 404 when the assistant agent doesn't exist or was deleted.
 */
export async function getAssistantAgent(
  id: string,
): Promise<AssistantAgentDetail> {
  const res = await backendFetch(`/assistant-agents/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /assistant-agents (deleted assistant agents are left out). */
export async function listAssistantAgents({
  limit,
  offset,
  filters = {},
  sort = ASSISTANT_AGENTS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<AssistantAgentsList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/assistant-agents?${query}`);
  return res.json();
}
