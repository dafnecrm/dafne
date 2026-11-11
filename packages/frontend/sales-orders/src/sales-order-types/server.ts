import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { SALES_ORDER_TYPES_DEFAULT_SORT } from "./sales-order-types-table.ts";
import type { SalesOrderTypeDetail, SalesOrderTypesList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /sales-order-types/:id. Throws a BackendError with
 * status 404 when the sales order type doesn't exist or was deleted.
 */
export async function getSalesOrderType(
  id: string,
): Promise<SalesOrderTypeDetail> {
  const res = await backendFetch(
    `/sales-order-types/${encodeURIComponent(id)}`,
  );
  return res.json();
}

/** Calls the backend's GET /sales-order-types (deleted sales order types are left out). */
export async function listSalesOrderTypes({
  limit,
  offset,
  filters = {},
  search,
  sort = SALES_ORDER_TYPES_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  /** Text the id or the description contains. */
  search?: string;
  sort?: TableSort;
}): Promise<SalesOrderTypesList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  if (search) {
    query.set("search", search);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/sales-order-types?${query}`);
  return res.json();
}

