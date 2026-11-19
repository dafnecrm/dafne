import { z } from 'zod';
import {
  pageQuery,
  requiredText,
  SORT_DIRECTIONS,
  optionalText,
  type Page,
} from './common.ts';
import { msg } from './messages/index.ts';
import { uomId, type UomSummary } from './uoms.ts';

/* ---------- Requests ---------- */

/**
 * A unit the product is also sold in: one its base unit has a conversion
 * with (/uom-conversions gives the factor).
 */
export const productUnitBodySchema = z.strictObject({
  uomId: uomId(msg('products.units.uomId.required')),
});
export type ProductUnitBodyInput = z.input<typeof productUnitBodySchema>;
export type ProductUnitBody = z.output<typeof productUnitBodySchema>;

/**
 * Body of POST /products and PUT /products/:id. PUT replaces the
 * whole product: omitted optional fields are cleared, and `units` replaces
 * the product's own units.
 */
export const productBodySchema = z
  .strictObject({
    name: requiredText(255, msg('products.name.required')),
    description: optionalText(z.string().max(65535)),
    price: z
      .string()
      .regex(/^-?\d+(\.\d+)?$/, { error: msg('common.number.invalid') }),
    /** The base unit: sales order quantities are converted to it. */
    uomId: uomId(msg('products.uomId.required')),
    units: z.array(productUnitBodySchema).max(100).default([]),
  })
  .superRefine((body, ctx) => {
    const seen = new Set<string>();
    body.units.forEach((unit, index) => {
      if (unit.uomId === body.uomId) {
        ctx.addIssue({
          code: 'custom',
          path: ['units', index, 'uomId'],
          message: msg('products.units.uomId.base'),
        });
      } else if (seen.has(unit.uomId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['units', index, 'uomId'],
          message: msg('products.units.uomId.duplicate'),
        });
      }
      seen.add(unit.uomId);
    });
  });

/** What a client sends: blank optional fields may be "", null or missing. */
export type ProductBodyInput = z.input<typeof productBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type ProductBody = z.output<typeof productBodySchema>;

/** Product fields the list can be sorted by. */
export const PRODUCT_SORT_FIELDS = ['id', 'name', 'price', 'createdAt', 'updatedAt'] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

/**
 * Product fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id matches exactly).
 */
export const PRODUCT_FILTER_FIELDS = ['id', 'name', 'uomId'] as const;
export type ProductFilterField = (typeof PRODUCT_FILTER_FIELDS)[number];

/** Query string of GET /products. Deleted products are never listed. */
export const listProductsQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
      .string()
      .regex(/^\s*\d{0,9}\s*$/)
      .optional(),
  name: z.string().max(255).optional(),
  uomId: z.string().max(10).optional(),
  /** Defaults to id. */
    sortBy: z.enum(PRODUCT_SORT_FIELDS).optional(),
  /** Defaults to desc. */
    sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListProductsQuery = z.output<typeof listProductsQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A product in GET /products. */
export interface ListedProduct {
  id: number;
  name: string;
  price: string;
  /** The base unit. */
  uomId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /products. */
export type ProductsList = Page<ListedProduct>;

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
  uom: UomSummary;
  /** The units the product is also sold in, besides the base one. */
  units: ProductUnit[];
  /** Always null: deleted products aren't returned. */
    deletedAt: Date | null;
}

/**
 * A unit of a product: 1 `uomId` = `factor` × its base unit, the factor
 * coming from the conversion between them.
 */
export interface ProductUnit {
  uomId: string;
  uom: UomSummary;
  factor: number;
}

/** Where a unit a product is sold in comes from: its base unit, or its units. */
export type ProductSaleUnitSource = 'base' | 'product';

/**
 * A unit a product can be sold in, in GET /products/:id/uoms: a quantity in
 * it is `factor` × that quantity in the base unit.
 */
export interface ProductSaleUnit extends ProductUnit {
  source: ProductSaleUnitSource;
  /** The price of one of this unit: the product's price × `factor` (decimal, as text). */
  price: string;
}
