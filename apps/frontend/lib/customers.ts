import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";
import { backendFetch } from "./backend";
import type { TableFilters, TableSort } from "./data-table";
import { customersTable } from "./customers-table";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedCustomer = Json<contracts.ListedCustomer>;
export type CustomersList = Json<contracts.CustomersList>;
export type CustomerAddress = Json<contracts.CustomerAddress>;
export type CustomerUser = Json<contracts.CustomerUser>;
export type CustomerDetail = Json<contracts.CustomerDetail>;

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
  sort = customersTable.defaultSort,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<CustomersList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) query.set(field, value);
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/customers?${query}`);
  return res.json();
}

/** One line for an address, e.g. "Via Roma 1, 20100 Milano (MI), Italy". */
export function formatAddress(address: Omit<CustomerAddress, "id" | "type">) {
  const place = [address.postalCode, address.city].filter(Boolean).join(" ");
  const region = address.region ? ` (${address.region})` : "";
  return `${address.street}, ${place}${region}, ${address.country.name}`;
}
