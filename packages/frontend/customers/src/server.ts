import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { CUSTOMERS_DEFAULT_SORT } from "./customers-table.ts";
import type { CustomerDetail, CustomersList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /customers/:id. Throws a BackendError with
 * status 404 when the customer doesn't exist or was deleted.
 */
export async function getCustomer(id: string): Promise<CustomerDetail> {
  const res = await backendFetch(`/customers/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /customers (deleted customers are left out). */
export async function listCustomers({
  limit,
  offset,
  filters = {},
  search,
  sort = CUSTOMERS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  search?: string,
  sort?: TableSort;
}): Promise<CustomersList> {
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
  const res = await backendFetch(`/customers?${query}`);
  return res.json();
}
