import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";
import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { ordersTable } from "./orders-table";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedOrder = Json<contracts.ListedOrder>;
export type OrdersList = Json<contracts.OrdersList>;
export type OrderUser = Json<contracts.OrderUser>;
export type OrderDetail = Json<contracts.OrderDetail>;

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
  sort = ordersTable.defaultSort,
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
