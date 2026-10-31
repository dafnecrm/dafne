"use server";

import type * as contracts from "@backend/contracts";
import type { Json } from "@backend/contracts";
import { BackendError, backendFetch } from "./backend";

export type GeoPlace = Json<contracts.GeoPlace>;

/** Searches shorter than this aren't sent: they'd match half the world. */
const MIN_LENGTH = 3;

/**
 * Places matching `q` (an address, a city…), from the backend's
 * GET /geo/search. A server action, so client components can call it while
 * the user types. Returns an error message instead of throwing.
 */
export async function searchPlaces(
  q: string,
): Promise<{ places: GeoPlace[]; error?: string }> {
  const query = q.trim();
  if (query.length < MIN_LENGTH) return { places: [] };
  try {
    const res = await backendFetch(
      `/geo/search?${new URLSearchParams({ q: query, limit: "5" })}`,
    );
    return (await res.json()) as Json<contracts.GeoSearchResult>;
  } catch (error) {
    if (!(error instanceof BackendError)) throw error;
    return {
      places: [],
      error:
        error.status === 503
          ? "Address search is unavailable. Try again later."
          : error.message || "The search failed.",
    };
  }
}
