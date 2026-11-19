import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { UOM_CONVERSIONS_DEFAULT_SORT } from "./uom-conversions-table.ts";
import type { UomConversionDetail, UomConversionsList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /uom-conversions/:id. Throws a BackendError with
 * status 404 when the uom conversion doesn't exist or was deleted.
 */
export async function getUomConversion(
  id: string,
): Promise<UomConversionDetail> {
  const res = await backendFetch(`/uom-conversions/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /uom-conversions (deleted uom conversions are left out). */
export async function listUomConversions({
  limit,
  offset,
  filters = {},
  sort = UOM_CONVERSIONS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<UomConversionsList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/uom-conversions?${query}`);
  return res.json();
}
