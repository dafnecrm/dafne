import { z } from "zod";
import {
  pageQuery,
  SORT_DIRECTIONS,
  requiredText,
  optionalText,
  type Page,
} from "./common.ts";
import { msg } from "./messages/index.ts";

/* ---------- Requests ---------- */

/** Values of uom kind. */
export const UOM_KINDS = [
  "weight",
  "volume",
  "length",
  "area",
  "count",
  "time",
] as const;
export type UomKind = (typeof UOM_KINDS)[number];

/** A unit's id (its symbol, e.g. "kg"). */
export const uomId = (error: Parameters<typeof requiredText>[1]) =>
  requiredText(10, error);

/**
 * A conversion factor: how many of one unit make one of the other
 * (g → kg: 1000). Greater than zero.
 */
export const uomFactor = z.coerce
  .number({ error: msg("uoms.factor.required") })
  .positive({ error: msg("uoms.factor.positive") });

/**
 * Body of POST /uoms and PUT /uoms/:id. PUT replaces the
 * whole uom: omitted optional fields are cleared. The id is the symbol the
 * client picks on POST (409 when taken); PUT keeps the path's. Conversions
 * are a resource of their own (/uom-conversions).
 */
export const uomBodySchema = z.strictObject({
  id: uomId(msg("uoms.id.required")),
  name: requiredText(100, msg("uoms.name.required")),
  description: optionalText(z.string().max(65535)),
  kind: z.enum(UOM_KINDS, { error: msg("uoms.kind.required") }),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type UomBodyInput = z.input<typeof uomBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type UomBody = z.output<typeof uomBodySchema>;

/** Uom fields the list can be sorted by. */
export const UOM_SORT_FIELDS = [
  "id",
  "name",
  "description",
  "kind",
  "createdAt",
  "updatedAt",
] as const;
export type UomSortField = (typeof UOM_SORT_FIELDS)[number];

/**
 * Uom fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id and the keys to other records match exactly).
 */
export const UOM_FILTER_FIELDS = ["id", "name", "description", "kind"] as const;
export type UomFilterField = (typeof UOM_FILTER_FIELDS)[number];

/** Query string of GET /uoms. Deleted uoms are never listed. */
export const listUomsQuerySchema = z.strictObject({
  ...pageQuery,
  id: z.string().max(10).optional(),
  name: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
  kind: z.enum(UOM_KINDS).optional(),
  /** Free text: units whose id or name contains it. */
  search: z.string().max(255).optional(),
  /** Defaults to id. */
  sortBy: z.enum(UOM_SORT_FIELDS).optional(),
  /** Defaults to asc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListUomsQuery = z.output<typeof listUomsQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** An uom in GET /uoms. */
export interface ListedUom {
  id: string;
  name: string;
  description: string | null;
  kind: UomKind;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /uoms. */
export type UomsList = Page<ListedUom>;

/** A user who created or last updated an uom; null if since removed. */
export interface UomUser {
  id: string;
  name: string;
}

/** A unit as other records show it. */
export interface UomSummary {
  id: string;
  name: string;
}

/** A unit for a picker. */
export type UomOption = UomSummary & { kind: UomKind };

/** A conversion of a unit into another: 1 `to` = `factor` × the unit. */
export interface UomConversion {
  id: number;
  toUomId: string;
  to: UomSummary;
  factor: number;
}

/** A conversion of another unit into this one: 1 unit = `factor` × `from`. */
export interface UomConversionFrom {
  id: number;
  fromUomId: string;
  from: UomSummary;
  factor: number;
}

/** Response of GET /uoms/:id, POST /uoms and PUT /uoms/:id. */
export interface UomDetail extends ListedUom {
  createdBy: UomUser | null;
  updatedBy: UomUser | null;
  /** The conversions this unit is the `from` of (/uom-conversions edits them). */
  conversions: UomConversion[];
  /** The conversions this unit is the `to` of. */
  conversionsFrom: UomConversionFrom[];
  /** Always null: deleted uoms aren't returned. */
  deletedAt: Date | null;
}
