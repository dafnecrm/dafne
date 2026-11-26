import { z } from 'zod';
import {
  pageQuery,
  SORT_DIRECTIONS,
  requiredText,
  optionalText,
  optionalDate,
  requiredId,
  type Page,
} from './common.ts';
import { msg } from './messages/index.ts';
import {
  documentItemsSchema,
  type SalesOrderCustomer,
  type SalesOrderDetailItem,
  type SalesOrderStatus,
  type SalesOrderTypeSummary,
  type SalesOrderUser,
} from './sales-orders.ts';

/*
 * A quotation is an offer: the items of a sales order (same body, same
 * pricing), its own statuses. Accepting it creates its sales order, which
 * starts in draft with the quotation's items and prices.
 */

/* ---------- Requests ---------- */

/** Values of quotation status; accepted, rejected and expired are final. */
export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

/**
 * Body of POST /quotations and PUT /quotations/:id. PUT replaces the
 * whole quotation: omitted optional fields are cleared. The items are those
 * of a sales order (`salesOrderItemBodySchema`).
 */
export const quotationBodySchema = z.strictObject({
  status: z.enum(QUOTATION_STATUSES, { error: msg('quotations.status.required') }).optional(),
  notes: optionalText(z.string().max(65535)),
  customerId: requiredId(msg('quotations.customerId.required')),
  typeId: requiredText(5, msg('quotations.typeId.required')),
  validUntil: z.coerce.date({ error: msg('common.date.invalid') }),
  items: documentItemsSchema,
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type QuotationBodyInput = z.input<typeof quotationBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type QuotationBody = z.output<typeof quotationBodySchema>;

/**
 * Query of PUT /quotations/:id: `reprice=true` prices every item anew,
 * from its product's price today (otherwise unchanged items keep theirs).
 */
export const updateQuotationQuerySchema = z.strictObject({
  reprice: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
export type UpdateQuotationQuery = z.output<typeof updateQuotationQuerySchema>;

/**
 * Body of POST /quotations/:id/status: the status to move the quotation to.
 * `accepted` also creates its sales order.
 */
export const quotationStatusBodySchema = z.strictObject({
  status: z.enum(QUOTATION_STATUSES, { error: msg('quotations.status.required') }),
});
export type QuotationStatusBody = z.output<typeof quotationStatusBodySchema>;

/** Quotation fields the list can be sorted by. */
export const QUOTATION_SORT_FIELDS = ['id', 'status', 'validUntil', 'createdAt', 'updatedAt'] as const;
export type QuotationSortField = (typeof QUOTATION_SORT_FIELDS)[number];

/**
 * Quotation fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id and the keys to other records match exactly).
 */
export const QUOTATION_FILTER_FIELDS = ['id', 'status', 'customerId', 'typeId'] as const;
export type QuotationFilterField = (typeof QUOTATION_FILTER_FIELDS)[number];

/** Query string of GET /quotations. Deleted quotations are never listed. */
export const listQuotationsQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  status: z.enum(QUOTATION_STATUSES).optional(),
  customerId: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  typeId: z.string().max(5).optional(),
  /** Defaults to id. */
  sortBy: z.enum(QUOTATION_SORT_FIELDS).optional(),
  /** Defaults to desc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListQuotationsQuery = z.output<typeof listQuotationsQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A quotation in GET /quotations. */
export interface ListedQuotation {
  id: number;
  status: QuotationStatus;
  customerId: number;
  typeId: string;
  customer: SalesOrderCustomer;
  type: SalesOrderTypeSummary;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  itemsCount: number;
}

/** Response of GET /quotations. */
export type QuotationsList = Page<ListedQuotation>;

/** A user who created or last updated a quotation; null if since removed. */
export type QuotationUser = SalesOrderUser;

/** An item of a quotation: the same as a sales order's. */
export type QuotationDetailItem = SalesOrderDetailItem;

/** The sales order an accepted quotation became. */
export interface QuotationSalesOrder {
  id: number;
  status: SalesOrderStatus;
}

/** Response of GET /quotations/:id, POST /quotations and PUT /quotations/:id. */
export interface QuotationDetail extends Omit<ListedQuotation, 'itemsCount'> {
  createdBy: QuotationUser | null;
  updatedBy: QuotationUser | null;
  notes: string | null;
  items: QuotationDetailItem[];
  /** Its sales order once accepted; null before (or if that order was removed). */
  salesOrder: QuotationSalesOrder | null;
  /** Always null: deleted quotations aren't returned. */
  deletedAt: Date | null;
}
