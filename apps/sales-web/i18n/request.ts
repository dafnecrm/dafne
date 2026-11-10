import { CONTRACT_MESSAGES } from "@dafne/contracts";
import { CUSTOMERS_MESSAGES } from "@dafne/frontend-customers";
import { GEO_MESSAGES } from "@dafne/frontend-geo";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";
import { ACTIVITIES_MESSAGES } from "@dafne/frontend-activities";
import { PRODUCTS_MESSAGES } from "@dafne/frontend-products";
import { SALES_ORDERS_MESSAGES } from "@dafne/frontend-sales-orders";
import { SALES_ORDER_TYPES_MESSAGES } from "@dafne/frontend-sales-orders/sales-order-types";

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
      // Customer texts, shipped by @dafne/frontend-customers.
      customers: CUSTOMERS_MESSAGES[resolved],
      // Activity texts, shipped by @dafne/frontend-activities.
      activities: ACTIVITIES_MESSAGES[resolved],
      // Product texts, shipped by @dafne/frontend-products.
      products: PRODUCTS_MESSAGES[resolved],
      // Sales order texts, shipped by @dafne/frontend-sales-orders.
      salesOrders: SALES_ORDERS_MESSAGES[resolved],
      // Address search and country texts, shipped by @dafne/frontend-geo.
      geo: GEO_MESSAGES[resolved],
      salesOrderTypes: SALES_ORDER_TYPES_MESSAGES[resolved],
    },
  };
});
