"use server";

import type * as contracts from "@backend/contracts";
import { getTranslations } from "next-intl/server";
import type { Json } from "@backend/contracts";
import { BackendError, backendFetch } from "./backend";

export type GeoPlace = Json<contracts.GeoPlace>;
export type ListedCountry = Json<contracts.ListedCountry>;

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
    // The backend's message is already in the user's language.
    const t = await getTranslations("geo");
    return { places: [], error: error.message || t("searchFailed") };
  }
}

/**
 * Every country (ISO code and name, by name), from the backend's
 * GET /geo/countries. A server action, so client components can load them.
 */
export async function listCountries(): Promise<ListedCountry[]> {
  const res = await backendFetch("/geo/countries");
  return ((await res.json()) as Json<contracts.CountriesList>).countries;
}
