/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A country in GET /countries. */
export interface ListedCountry {
  /** ISO 3166-1 alpha-2, e.g. "IT"; the key of the country. */
  code: string;
  name: string;
}

/** Response of GET /countries. */
export interface CountriesList {
  countries: ListedCountry[];
}

/** A user who created or last updated a country; null if since removed. */
export interface CountryUser {
  id: string;
  name: string;
}

/** Response of GET /countries/:id, POST /countries and PUT /countries/:id. */
export interface CountryDetail extends ListedCountry {}
