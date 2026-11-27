/**
 * Geo texts in English (address search, countries). The source of truth:
 * it.ts must have the same keys (GeoMessages); the apps merge them under
 * `geo`.
 */
export const en = {
  countryPlaceholder: "Choose a country…",
  loadingCountries: "Loading countries…",
  noCountries: "No countries found.",
  noPlaces: "No places found.",
  searchFailed: "The search failed.",
  searchPlaceholder: "Search an address…",
  searching: "Searching…",
  tooShort: "Type at least {min} characters.",
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type GeoMessages = Shape<typeof en>;
