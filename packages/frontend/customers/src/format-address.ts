import { countryName } from "@dafne/frontend-ui/lib/country-name";
import type { CustomerAddress } from "./types.ts";

/** One line for an address, e.g. "Via Roma 1, 20100 Milano (MI), Italy". */
export function formatAddress(address: Omit<CustomerAddress, "id" | "type">, locale: string) {
  const place = [address.postalCode, address.city].filter(Boolean).join(" ");
  const region = address.region ? ` (${address.region})` : "";
  return `${address.street}, ${place}${region}, ${countryName(address.countryCode, locale, address.countryCode)}`;
}
