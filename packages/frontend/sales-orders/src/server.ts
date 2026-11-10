import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { SALES_ORDERS_DEFAULT_SORT } from "./sales-orders-table.ts";
import type { SalesOrderTypesList } from "@dafne/contracts";
import type {
  SalesOrderDetail,
  SalesOrderDetailItem,
  SalesOrdersList,
} from "./types.ts";

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

/** The sales order types' ids (GET /sales-order-types), for the form's type select. */
export async function listSalesOrderTypeIds(): Promise<string[]> {
  const res = await backendFetch(
    "/sales-order-types?limit=100&sortBy=id&sortDirection=asc",
  );
  const { salesOrderTypes } = (await res.json()) as SalesOrderTypesList;
  return salesOrderTypes.map((type) => type.id);
}

/**
 * Calls the backend's GET /sales-orders/:id/items/:position. Throws a
 * BackendError with status 404 when the item or its sales order doesn't
 * exist (or the order was deleted).
 */
export async function getSalesOrderItem(
  salesOrderId: number,
  position: number,
): Promise<SalesOrderDetailItem> {
  const res = await backendFetch(
    `/sales-orders/${encodeURIComponent(salesOrderId)}/items/${encodeURIComponent(position)}`,
  );
  return res.json();
}
