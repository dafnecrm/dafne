import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedCustomer = Json<contracts.ListedCustomer>;
export type CustomersList = Json<contracts.CustomersList>;
export type CustomerAddress = Json<contracts.CustomerAddress>;
export type CustomerUser = Json<contracts.CustomerUser>;
export type CustomerDetail = Json<contracts.CustomerDetail>;
