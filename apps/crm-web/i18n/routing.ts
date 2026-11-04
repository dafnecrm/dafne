import { defineRouting } from "next-intl/routing";

/**
 * Supported languages. The locale is never in the URL: the proxy rewrites
 * /customers to /it/customers internally, picking the language from the
 * NEXT_LOCALE cookie, else the browser's Accept-Language, else the default.
 * Pages are prerendered once per locale (generateStaticParams in
 * app/[locale]/layout.tsx).
 */
export const routing = defineRouting({
  locales: ["en", "it"],
  defaultLocale: "it",
  localePrefix: "never",
  // No alternate <link> headers: the URLs are the same in every language.
  alternateLinks: false,
});

export type AppLocale = (typeof routing.locales)[number];
