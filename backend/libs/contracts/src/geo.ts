import { z } from 'zod';
import { requiredText } from './common.ts';

/* ---------- Requests ---------- */

/** Query string of GET /geo/search. */
export const geoSearchQuerySchema = z.strictObject({
  /** What to look for: an address, a place, a city… */
  q: requiredText(200, 'Enter what to search'),
  /** How many places, at most. Defaults to 5. */
  limit: z.coerce.number().int().min(1).max(10).optional(),
});
export type GeoSearchQuery = z.output<typeof geoSearchQuerySchema>;

/* ---------- Responses ---------- */

/**
 * An address or an area found by GET /geo/search (OpenStreetMap data): a
 * house number, a street, a quarter, a city, a province, a region or a
 * country. Points of interest (shops, sights…) are never returned. The
 * address fields are named like a customer address, so a form can copy
 * them; a city's or a province's own name is in `city` or `county`.
 */
export interface GeoPlace {
  /** OSM type and id, e.g. "N5977935196". */
  id: string;
  /** The place as one line, e.g. "Via Roma 1, 20051 Cassina de' Pecchi, Lombardia, Italia". */
  label: string;
  /** What it is: house, street, locality, district, city, county, state, country. */
  kind: string;
  /** The OpenStreetMap name (of the street, the city, the quarter…). */
  name: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  /** Part of the city, e.g. a municipio or a quarter. */
  district: string | null;
  /** Province or county. */
  county: string | null;
  /** State, region. */
  region: string | null;
  country: string | null;
  /** ISO 3166-1 alpha-2, e.g. "IT". */
  countryCode: string | null;
  latitude: number;
  longitude: number;
}

/** Response of GET /geo/search, best match first, one per label. */
export interface GeoSearchResult {
  places: GeoPlace[];
}
