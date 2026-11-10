import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedSalesOrderType = Json<contracts.ListedSalesOrderType>;
export type SalesOrderTypesList = Json<contracts.SalesOrderTypesList>;
export type SalesOrderTypeUser = Json<contracts.SalesOrderTypeUser>;
export type SalesOrderTypeDetail = Json<contracts.SalesOrderTypeDetail>;
