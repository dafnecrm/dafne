import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedOrder = Json<contracts.ListedOrder>;
export type OrdersList = Json<contracts.OrdersList>;
export type OrderUser = Json<contracts.OrderUser>;
export type OrderDetail = Json<contracts.OrderDetail>;
