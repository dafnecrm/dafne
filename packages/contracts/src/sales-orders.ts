import { z } from 'zod';
import {
  SORT_DIRECTIONS,
  optionalText,
  pageQuery,
  requiredId,
  requiredInt,
  requiredNumber,
  requiredText,
  type Page,
} from './common.ts';
import { msg } from './messages/index.ts';
import type { UomSummary } from './uoms.ts';

/* ---------- Requests ---------- */

/**
 * An item: `quantity` is in `uomId`, the product's base unit when left out,
 * or a unit the product converts to (GET /products/:id/uoms).
 */
export const salesOrderItemBodySchema = z.strictObject({
  productId: requiredId(msg('salesOrders.items.productId.required')),
  quantity: requiredNumber(msg('salesOrders.items.quantity.required')).positive({
    error: msg('salesOrders.items.quantity.positive'),
  }),
  uomId: optionalText(z.string().max(10)),
  position: requiredInt(msg('salesOrders.items.position.required')),
});

export type SalesOrderItemBodyInput = z.input<typeof salesOrderItemBodySchema>;
export type SalesOrderItemBody = z.output<typeof salesOrderItemBodySchema>;

/**
 * The items of a document with products (a sales order, a quotation):
 * positions are their key, so two equal ones can't be saved.
 */
export const documentItemsSchema = z
  .array(salesOrderItemBodySchema)
  .default([])
  .refine((items) => new Set(items.map((item) => item.position)).size === items.length, {
    error: msg('salesOrders.items.position.duplicate'),
  });

/** Values of sales order status. */
export const SALES_ORDER_STATUSES = ['draft', 'open', 'completed', 'cancelled', 'rejected'] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

/**
 * Body of POST /sales-orders and PUT /sales-orders/:id. PUT replaces the
 * whole sales order: omitted optional fields are cleared.
 */
export const salesOrderBodySchema = z.strictObject({
  status: z.enum(SALES_ORDER_STATUSES, { error: msg('salesOrders.status.required') }).optional(),
  notes: optionalText(z.string().max(65535)),
  customerId: requiredId(msg('salesOrders.customerId.required')),
  typeId: requiredText(5, msg('salesOrders.typeId.required')),
  items: documentItemsSchema,
});

/**
 * Query of PUT /sales-orders/:id: `reprice=true` prices every item anew,
 * from its product's price today (otherwise unchanged items keep theirs).
 */
export const updateSalesOrderQuerySchema = z.strictObject({
  reprice: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
export type UpdateSalesOrderQuery = z.output<typeof updateSalesOrderQuerySchema>;

/** Body of POST /sales-orders/:id/status: the status to move the order to. */
export const salesOrderStatusBodySchema = z.strictObject({
  status: z.enum(SALES_ORDER_STATUSES, { error: msg('salesOrders.status.required') }),
});
export type SalesOrderStatusBody = z.output<typeof salesOrderStatusBodySchema>;

/** What a client sends: blank optional fields may be "", null or missing. */
export type SalesOrderBodyInput = z.input<typeof salesOrderBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type SalesOrderBody = z.output<typeof salesOrderBodySchema>;

/** Sales order fields the list can be sorted by. */
export const SALES_ORDER_SORT_FIELDS = ['id', 'status', 'createdAt', 'updatedAt'] as const;
export type SalesOrderSortField = (typeof SALES_ORDER_SORT_FIELDS)[number];

export const SALES_ORDER_ITEM_SORT_FIELDS = ['position', 'createdAt', 'updatedAt'] as const;
export type SalesOrderItemSortField = (typeof SALES_ORDER_ITEM_SORT_FIELDS)[number];

/**
 * Sales order fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id matches exactly).
 */
export const SALES_ORDER_FILTER_FIELDS = ['id', 'status', 'customerId', 'typeId'] as const;
export type SalesOrderFilterField = (typeof SALES_ORDER_FILTER_FIELDS)[number];

/** Query string of GET /sales-orders. Deleted sales orders are never listed. */
export const listSalesOrdersQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  status: z.enum(SALES_ORDER_STATUSES).optional(),
  customerId: z.string().regex(/^\s*\d{0,9}\s*$/).optional(),
  typeId: z.string().max(5).optional(),
  /** Defaults to id. */
  sortBy: z.enum(SALES_ORDER_SORT_FIELDS).optional(),
  /** Defaults to desc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListSalesOrdersQuery = z.output<typeof listSalesOrdersQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A sales order in GET /sales-orders. */
export interface ListedSalesOrder {
  id: number;
  status: SalesOrderStatus;
  customerId: number;
  typeId: string;
  customer: SalesOrderCustomer,
  type: SalesOrderTypeSummary,
  createdAt: Date;
  updatedAt: Date;
  itemsCount: number;
}


/** Response of GET /sales-orders. */
export type SalesOrdersList = Page<ListedSalesOrder>;

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

/** A sales order's type (its code and description). */
export interface SalesOrderTypeSummary {
  id: string;
  description: string;
}

/** Response of GET /sales-orders/:id, POST /sales-orders and PUT /sales-orders/:id. */

export interface SalesOrderDetailItem {
  position: number;
  productId: number;
  product: {
    id: number,
    name: string,
    /** The product's base unit. */
    uom: UomSummary,
    /** The product's price, of one base unit (today's: the item's is in `price`). */
    price: number,
  };
  /** In `uom`. */
  quantity: number;
  uomId: string;
  uom: UomSummary;
  /** The quantity in the product's base unit. */
  baseQuantity: number;
  /**
   * The item's price: the product's price × the base quantity, as it was
   * when the item was set (rounded to 2 decimals).
   */
  price: number;
}
export interface SalesOrderDetail extends Omit<ListedSalesOrder, 'itemsCount'> {
  notes: string | null;
  customer: SalesOrderCustomer;
  type: SalesOrderTypeSummary;
  items: SalesOrderDetailItem[];
  createdBy: SalesOrderUser | null;
  updatedBy: SalesOrderUser | null;
  /** Always null: deleted sales orders aren't returned. */
  deletedAt: Date | null;
  customerId: number;
  typeId: string;
  /** The quotation it was made from (when accepted); null if entered on its own. */
  quotationId: number | null;
  /**
   * The statuses it can move to from `status`, as the state machine allows
   * (its guards may still refuse one). Empty when `status` is final.
   */
  nextStatuses: SalesOrderStatus[];
}

/** The sales order items */
export interface SalesOrderItem {
  productId: number;
  quantity: number;
  uomId: string;
  baseQuantity: number;
  price: number;
  position: number;
}
