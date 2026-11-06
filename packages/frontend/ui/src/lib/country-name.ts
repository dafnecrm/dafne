/**
 * A country's name in `locale` from its ISO 3166-1 alpha-2 code ("IT" →
 * "Italia"), or `fallback` when the runtime doesn't know it.
 */
export function countryName(code: string, locale: string, fallback = code) {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? fallback;
  } catch {
    return fallback;
  }
}
