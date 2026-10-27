import { backendFetch } from "./backend";
import type { TableFilters, TableSort } from "./data-table";
import { customersTable } from "./customers-table";

/** A customer from the backend's GET /customers. Dates as JSON strings. */
export interface ListedCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersPage {
  customers: ListedCustomer[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface CustomerAddress {
  id: string;
  /** e.g. "Billing", "Shipping". */
  label: string | null;
  street: string;
  city: string;
  postalCode: string | null;
  /** State, province or region. */
  region: string | null;
  country: string;
}

/** A user who created or last updated a customer; null if since removed. */
export interface CustomerUser {
  id: string;
  name: string;
}

/** A customer from the backend's GET /customers/:id. */
export type CustomerDetail = ListedCustomer & {
  /** In display order. */
  addresses: CustomerAddress[];
  createdBy: CustomerUser | null;
  updatedBy: CustomerUser | null;
  /** Always null: deleted customers aren't returned. */
  deletedAt: string | null;
};

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
}): Promise<CustomersPage> {
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
export function formatAddress(address: Omit<CustomerAddress, "id" | "label">) {
  const place = [address.postalCode, address.city].filter(Boolean).join(" ");
  const region = address.region ? ` (${address.region})` : "";
  return `${address.street}, ${place}${region}, ${address.country}`;
}
