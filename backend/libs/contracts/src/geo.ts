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
 * A place found by GET /geo/search (OpenStreetMap data). The address
 * fields are named like a customer address, so a form can copy them.
 */
export interface GeoPlace {
  /** OSM type and id, e.g. "N5977935196". */
  id: string;
  /** The place as one line, e.g. "Via Roma 1, 20051 Cassina de' Pecchi (Lombardia), Italia". */
  label: string;
  /** What it is: house, street, city, country… */
  kind: string;
  /** The place's own name (a building, a shop…), if it has one. */
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

/** Response of GET /geo/search, best match first. */
export interface GeoSearchResult {
  places: GeoPlace[];
}
