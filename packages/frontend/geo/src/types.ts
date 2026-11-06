import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/** A place found by the address search (GET /geo/search). */
export type GeoPlace = Json<contracts.GeoPlace>;
/** A country (ISO code and name), from GET /geo/countries. */
export type ListedCountry = Json<contracts.ListedCountry>;
