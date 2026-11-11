import { z } from 'zod';
import { pageQuery, requiredText, SORT_DIRECTIONS } from './common.ts';
import { msg } from './messages/index.ts';

/* ---------- Requests ---------- */

/**
 * Body of POST /sales-order-types and PUT /sales-order-types/:id. PUT replaces the
 * whole sales order type: omitted optional fields are cleared. The id is a
 * code the client picks on POST (409 when taken); PUT keeps the path's.
 */
export const salesOrderTypeBodySchema = z.strictObject({
  id: requiredText(5, msg('salesOrderTypes.id.required')),
  description: requiredText(255, msg('salesOrderTypes.description.required')),
  active: z.boolean().nullish().transform((value) => value ?? null),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type SalesOrderTypeBodyInput = z.input<typeof salesOrderTypeBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type SalesOrderTypeBody = z.output<typeof salesOrderTypeBodySchema>;

/** Sales order type fields the list can be sorted by. */
export const SALES_ORDER_TYPE_SORT_FIELDS = ['id', 'description', 'active', 'createdAt', 'updatedAt'] as const;
export type SalesOrderTypeSortField =
  (typeof SALES_ORDER_TYPE_SORT_FIELDS)[number];

/**
 * Sales order type fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id matches exactly).
 */
export const SALES_ORDER_TYPE_FILTER_FIELDS = ['id', 'description', 'active'] as const;
export type SalesOrderTypeFilterField =
  (typeof SALES_ORDER_TYPE_FILTER_FIELDS)[number];

/** Query string of GET /sales-order-types. Deleted sales order types are never listed. */
export const listSalesOrderTypesQuerySchema = z.strictObject({
  ...pageQuery,
  id: z.string().max(5).optional(),
  description: z.string().max(255).optional(),
  active: z.enum(['true', 'false']).optional(),
  /** Free text: sales order types whose id or description contains it. */
  search: z.string().max(255).optional(),
  /** Defaults to createdAt. */
    sortBy: z.enum(SALES_ORDER_TYPE_SORT_FIELDS).optional(),
  /** Defaults to asc. */
    sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListSalesOrderTypesQuery = z.output<
  typeof listSalesOrderTypesQuerySchema
>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A sales order type in GET /sales-order-types. */
export interface ListedSalesOrderType {
  id: string;
  description: string;
  active: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /sales-order-types. */
export interface SalesOrderTypesList {
  salesOrderTypes: ListedSalesOrderType[];
  total: number;
  limit: number;
  offset: number;
}

/** A user who created or last updated a sales order type; null if since removed. */
export interface SalesOrderTypeUser {
  id: string;
  name: string;
}

/** Response of GET /sales-order-types/:id, POST /sales-order-types and PUT /sales-order-types/:id. */
export interface SalesOrderTypeDetail extends ListedSalesOrderType {
  createdBy: SalesOrderTypeUser | null;
  updatedBy: SalesOrderTypeUser | null;
  /** Always null: deleted sales order types aren't returned. */
    deletedAt: Date | null;
}
