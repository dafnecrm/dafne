import { z } from 'zod';
import {
  pageQuery,
  requiredText,
  SORT_DIRECTIONS,
  optionalText,
} from './common.ts';
import { msg } from './messages/index.ts';

/* ---------- Requests ---------- */

/**
 * Body of POST /products and PUT /products/:id. PUT replaces the
 * whole product: omitted optional fields are cleared.
 */
export const productBodySchema = z.strictObject({
  name: requiredText(255, msg('products.name.required')),
  description: optionalText(z.string().max(65535)),
  price: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, { error: msg('common.number.invalid') }),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type ProductBodyInput = z.input<typeof productBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type ProductBody = z.output<typeof productBodySchema>;

/** Product fields the list can be sorted by. */
export const PRODUCT_SORT_FIELDS = [
  'name',
  'price',
  'createdAt',
  'updatedAt',
] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

/**
 * Product fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains.
 */
export const PRODUCT_FILTER_FIELDS = ['name'] as const;
export type ProductFilterField = (typeof PRODUCT_FILTER_FIELDS)[number];

/** Query string of GET /products. Deleted products are never listed. */
export const listProductsQuerySchema = z.strictObject({
  ...pageQuery,
  name: z.string().max(255).optional(),
  /** Defaults to name. */
  sortBy: z.enum(PRODUCT_SORT_FIELDS).optional(),
  /** Defaults to asc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListProductsQuery = z.output<typeof listProductsQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A product in GET /products. */
export interface ListedProduct {
  id: string;
  name: string;
  price: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /products. */
export interface ProductsList {
  products: ListedProduct[];
  total: number;
  limit: number;
  offset: number;
}

/** A user who created or last updated a product; null if since removed. */
export interface ProductUser {
  id: string;
  name: string;
}

/** Response of GET /products/:id, POST /products and PUT /products/:id. */
export interface ProductDetail extends ListedProduct {
  createdBy: ProductUser | null;
  updatedBy: ProductUser | null;
  description: string | null;
  /** Always null: deleted products aren't returned. */
  deletedAt: Date | null;
}
