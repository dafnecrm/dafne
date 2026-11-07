import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { SALES_ORDERS_DEFAULT_SORT } from "./sales-orders-table.ts";
import type { OrderDetail, OrdersList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /orders/:id. Throws a BackendError with
 * status 404 when the order doesn't exist or was deleted.
 */
export async function getOrder(id: string): Promise<OrderDetail> {
  const res = await backendFetch(`/orders/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /orders (deleted orders are left out). */
export async function listOrders({
  limit,
  offset,
  filters = {},
  sort = SALES_ORDERS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<OrdersList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) query.set(field, value);
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/orders?${query}`);
  return res.json();
}
