import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";
import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { productsTable } from "./products-table";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedProduct = Json<contracts.ListedProduct>;
export type ProductsList = Json<contracts.ProductsList>;
export type ProductUser = Json<contracts.ProductUser>;
export type ProductDetail = Json<contracts.ProductDetail>;

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
  sort = productsTable.defaultSort,
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
  for (const [field, value] of Object.entries(filters)) query.set(field, value);
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/products?${query}`);
  return res.json();
}
