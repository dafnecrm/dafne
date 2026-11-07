import { z } from 'zod';
import {
  pageQuery,
  requiredId,
  SORT_DIRECTIONS,
  optionalText,
} from './common.ts';
import { msg } from './messages/index.ts';

/* ---------- Requests ---------- */

/**
 * Body of POST /sales-orders and PUT /sales-orders/:id. PUT replaces the
 * whole sales order: omitted optional fields are cleared.
 */
export const salesOrderBodySchema = z.strictObject({
  notes: optionalText(z.string().max(65535)),
  customerId: requiredId(msg('salesOrders.customerId.required')),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type SalesOrderBodyInput = z.input<typeof salesOrderBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type SalesOrderBody = z.output<typeof salesOrderBodySchema>;

/** Sales order fields the list can be sorted by. */
export const SALES_ORDER_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;
export type SalesOrderSortField = (typeof SALES_ORDER_SORT_FIELDS)[number];

/**
 * Sales order fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id matches exactly).
 */
export const SALES_ORDER_FILTER_FIELDS = ['id'] as const;
export type SalesOrderFilterField = (typeof SALES_ORDER_FILTER_FIELDS)[number];

/** Query string of GET /sales-orders. Deleted sales orders are never listed. */
export const listSalesOrdersQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  /** Defaults to createdAt. */
  sortBy: z.enum(SALES_ORDER_SORT_FIELDS).optional(),
  /** Defaults to asc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListSalesOrdersQuery = z.output<typeof listSalesOrdersQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A sales order in GET /sales-orders. */
export interface ListedSalesOrder {
  id: number;
  customerId: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /sales-orders. */
export interface SalesOrdersList {
  salesOrders: ListedSalesOrder[];
  total: number;
  limit: number;
  offset: number;
}

/** A user who created or last updated a sales order; null if since removed. */
export interface SalesOrderUser {
  id: string;
  name: string;
}

/** The sales order customer */
export interface SalesOrderCustomer {
  id: number;
  name: string;
}

/** Response of GET /sales-orders/:id, POST /sales-orders and PUT /sales-orders/:id. */
export interface SalesOrderDetail extends ListedSalesOrder {
  notes: string | null;
  customer: SalesOrderCustomer;
  createdBy: SalesOrderUser | null;
  updatedBy: SalesOrderUser | null;
  /** Always null: deleted sales orders aren't returned. */
  deletedAt: Date | null;
}
