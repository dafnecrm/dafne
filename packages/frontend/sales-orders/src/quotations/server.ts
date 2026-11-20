import { backendFetch } from "@dafne/frontend-api/server";
import type { ChangesPage } from "@dafne/frontend-changelog";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { QUOTATIONS_DEFAULT_SORT } from "./quotations-table.ts";
import type { QuotationDetail, QuotationsList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /quotations/:id. Throws a BackendError with
 * status 404 when the quotation doesn't exist or was deleted.
 */
export async function getQuotation(id: string): Promise<QuotationDetail> {
  const res = await backendFetch(`/quotations/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /quotations (deleted quotations are left out). */
export async function listQuotations({
  limit,
  offset,
  filters = {},
  sort = QUOTATIONS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<QuotationsList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/quotations?${query}`);
  return res.json();
}

/**
 * Calls the backend's GET /quotations/:id/changes (newest first). Throws
 * a BackendError with status 404 when the quotation doesn't exist or was
 * deleted.
 */
export async function listQuotationChanges(
  id: QuotationDetail["id"],
  { limit, offset }: { limit: number; offset: number },
): Promise<ChangesPage> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await backendFetch(
    `/quotations/${encodeURIComponent(id)}/changes?${query}`,
  );
  return res.json();
}
