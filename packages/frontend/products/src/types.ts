import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedProduct = Json<contracts.ListedProduct>;
export type ProductsList = Json<contracts.ProductsList>;
export type ProductUser = Json<contracts.ProductUser>;
export type ProductDetail = Json<contracts.ProductDetail>;
