import { z } from "zod";
import { pageQuery, SORT_DIRECTIONS, type Page } from "./common.ts";
import { msg } from "./messages/index.ts";
import { uomFactor, uomId, type UomSummary } from "./uoms.ts";

/* ---------- Requests ---------- */

/**
 * Body of POST /uom-conversions and PUT /uom-conversions/:id: 1 `toUomId` =
 * `factor` × `fromUomId` (g → kg: 1000), for every product. Both units must
 * be of the same kind, and a pair has one conversion (either direction).
 */
export const uomConversionBodySchema = z
  .strictObject({
    fromUomId: uomId(msg("uomConversions.fromUomId.required")),
    toUomId: uomId(msg("uomConversions.toUomId.required")),
    factor: uomFactor,
  })
  .refine((body) => body.fromUomId !== body.toUomId, {
    path: ["toUomId"],
    error: msg("uomConversions.toUomId.self"),
  });

/** What a client sends: blank optional fields may be "", null or missing. */
export type UomConversionBodyInput = z.input<typeof uomConversionBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type UomConversionBody = z.output<typeof uomConversionBodySchema>;

/** Uom conversion fields the list can be sorted by. */
export const UOM_CONVERSION_SORT_FIELDS = [
  "id",
  "fromUomId",
  "toUomId",
  "factor",
  "createdAt",
  "updatedAt",
] as const;
export type UomConversionSortField =
  (typeof UOM_CONVERSION_SORT_FIELDS)[number];

/**
 * Uom conversion fields the list can be filtered by, each a query param of
 * its own, matched exactly; `uomId` matches either unit.
 */
export const UOM_CONVERSION_FILTER_FIELDS = [
  "id",
  "fromUomId",
  "toUomId",
  "uomId",
] as const;
export type UomConversionFilterField =
  (typeof UOM_CONVERSION_FILTER_FIELDS)[number];

/** Query string of GET /uom-conversions. Deleted uom conversions are never listed. */
export const listUomConversionsQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  fromUomId: z.string().max(10).optional(),
  toUomId: z.string().max(10).optional(),
  /** The conversions of this unit, whichever side it is on. */
  uomId: z.string().max(10).optional(),
  /** Defaults to fromUomId. */
  sortBy: z.enum(UOM_CONVERSION_SORT_FIELDS).optional(),
  /** Defaults to asc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListUomConversionsQuery = z.output<
  typeof listUomConversionsQuerySchema
>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A conversion in GET /uom-conversions: 1 `to` = `factor` × `from`. */
export interface ListedUomConversion {
  id: number;
  fromUomId: string;
  toUomId: string;
  from: UomSummary;
  to: UomSummary;
  factor: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /uom-conversions. */
export type UomConversionsList = Page<ListedUomConversion>;

/** A user who created or last updated an uom conversion; null if since removed. */
export interface UomConversionUser {
  id: string;
  name: string;
}

/** Response of GET /uom-conversions/:id, POST /uom-conversions and PUT /uom-conversions/:id. */
export interface UomConversionDetail extends ListedUomConversion {
  createdBy: UomConversionUser | null;
  updatedBy: UomConversionUser | null;
  /** Always null: deleted uom conversions aren't returned. */
  deletedAt: Date | null;
}
