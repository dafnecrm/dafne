import { CONTRACT_MESSAGES } from "@dafne/contracts";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

/**
 * The locale of the current render. Server Components read the [locale]
 * root param, which works when prerendering. Server Actions can't read root
 * params, so they fall back to the header the proxy sets on every request.
 */
async function currentLocale(requestLocale: Promise<string | undefined>) {
  let locale: string | undefined;
  try {
    locale = await rootLocale();
  } catch {
    locale = await requestLocale;
  }
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const resolved = hasLocale(routing.locales, locale)
    ? locale
    : await currentLocale(requestLocale);
  return {
    locale: resolved,
    messages: {
      ...(await import(`../messages/${resolved}.json`)).default,
      // Validation and API error texts, shared with the backend.
      contracts: CONTRACT_MESSAGES[resolved],
    },
  };
});
