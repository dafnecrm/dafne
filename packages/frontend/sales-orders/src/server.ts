import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { SALES_ORDERS_DEFAULT_SORT } from "./sales-orders-table.ts";
import type { SalesOrderDetail, SalesOrdersList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /sales-orders/:id. Throws a BackendError with
 * status 404 when the sales order doesn't exist or was deleted.
 */
export async function getSalesOrder(id: string): Promise<SalesOrderDetail> {
  const res = await backendFetch(`/sales-orders/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /sales-orders (deleted sales orders are left out). */
export async function listSalesOrders({
  limit,
  offset,
  filters = {},
  sort = SALES_ORDERS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<SalesOrdersList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) query.set(field, value);
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/sales-orders?${query}`);
  return res.json();
}
