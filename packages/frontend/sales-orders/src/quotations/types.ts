import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedQuotation = Json<contracts.ListedQuotation>;
export type QuotationsList = Json<contracts.QuotationsList>;
export type QuotationUser = Json<contracts.QuotationUser>;
export type QuotationDetail = Json<contracts.QuotationDetail>;
export type QuotationDetailItem = Json<contracts.QuotationDetailItem>;
export type QuotationSalesOrder = Json<contracts.QuotationSalesOrder>;
