import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { UOMS_DEFAULT_SORT } from "./uoms-table.ts";
import type { UomDetail, UomOption, UomsList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /uoms/:id. Throws a BackendError with
 * status 404 when the uom doesn't exist or was deleted.
 */
export async function getUom(id: string): Promise<UomDetail> {
  const res = await backendFetch(`/uoms/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /uoms (deleted uoms are left out). */
export async function listUoms({
  limit,
  offset,
  filters = {},
  sort = UOMS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<UomsList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/uoms?${query}`);
  return res.json();
}

/**
 * Every unit that isn't deleted, by symbol, for the pickers (units are
 * few: one page holds them).
 */
export async function listUomOptions(): Promise<UomOption[]> {
  const res = await backendFetch(`/uoms?limit=100&sortBy=id&sortDirection=asc`);
  const { items } = (await res.json()) as UomsList;
  return items.map(({ id, name, kind }) => ({ id, name, kind }));
}
