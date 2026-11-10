import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { PRODUCTS_DEFAULT_SORT } from "./products-table.ts";
import type { ProductDetail, ProductsList } from "./types.ts";

/*
 * Reads from the backend, for server components (backendFetch forwards the
 * browser's cookies, so it only runs on the server).
 */

/**
 * Calls the backend's GET /products/:id. Throws a BackendError with
 * status 404 when the product doesn't exist or was deleted.
 */
export async function getProduct(id: string): Promise<ProductDetail> {
  const res = await backendFetch(`/products/${encodeURIComponent(id)}`);
  return res.json();
}

/** Calls the backend's GET /products (deleted products are left out). */
export async function listProducts({
  limit,
  offset,
  filters = {},
  sort = PRODUCTS_DEFAULT_SORT,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<ProductsList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/products?${query}`);
  return res.json();
}
