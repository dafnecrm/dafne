import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedUom = Json<contracts.ListedUom>;
export type UomsList = Json<contracts.UomsList>;
export type UomUser = Json<contracts.UomUser>;
export type UomDetail = Json<contracts.UomDetail>;
export type UomOption = Json<contracts.UomOption>;
export type UomConversion = Json<contracts.UomConversion>;
