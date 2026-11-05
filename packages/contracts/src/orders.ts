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
 * Body of POST /orders and PUT /orders/:id. PUT replaces the
 * whole order: omitted optional fields are cleared.
 */
export const orderBodySchema = z.strictObject({
  notes: optionalText(z.string().max(65535)),
  customerId: requiredId(msg('orders.customerId.required')),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type OrderBodyInput = z.input<typeof orderBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type OrderBody = z.output<typeof orderBodySchema>;

/** Order fields the list can be sorted by. */
export const ORDER_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;
export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

/**
 * Order fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id matches exactly).
 */
export const ORDER_FILTER_FIELDS = ['id'] as const;
export type OrderFilterField = (typeof ORDER_FILTER_FIELDS)[number];

/** Query string of GET /orders. Deleted orders are never listed. */
export const listOrdersQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  /** Defaults to createdAt. */
  sortBy: z.enum(ORDER_SORT_FIELDS).optional(),
  /** Defaults to asc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListOrdersQuery = z.output<typeof listOrdersQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** An order in GET /orders. */
export interface ListedOrder {
  id: number;
  customerId: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /orders. */
export interface OrdersList {
  orders: ListedOrder[];
  total: number;
  limit: number;
  offset: number;
}

/** A user who created or last updated an order; null if since removed. */
export interface OrderUser {
  id: string;
  name: string;
}

/** Response of GET /orders/:id, POST /orders and PUT /orders/:id. */
export interface OrderDetail extends ListedOrder {
  notes: string | null;
  createdBy: OrderUser | null;
  updatedBy: OrderUser | null;
  /** Always null: deleted orders aren't returned. */
  deletedAt: Date | null;
}
