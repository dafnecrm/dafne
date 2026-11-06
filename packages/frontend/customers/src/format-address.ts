import type { CustomerAddress } from "./types.ts";

/** One line for an address, e.g. "Via Roma 1, 20100 Milano (MI), Italy". */
export function formatAddress(address: Omit<CustomerAddress, "id" | "type">) {
  const place = [address.postalCode, address.city].filter(Boolean).join(" ");
  const region = address.region ? ` (${address.region})` : "";
  return `${address.street}, ${place}${region}, ${address.country.name}`;
}
