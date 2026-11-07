import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedSalesOrder = Json<contracts.ListedSalesOrder>;
export type SalesOrdersList = Json<contracts.SalesOrdersList>;
export type SalesOrderUser = Json<contracts.SalesOrderUser>;
export type SalesOrderDetail = Json<contracts.SalesOrderDetail>;
