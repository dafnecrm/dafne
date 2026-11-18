import { CONTRACT_MESSAGES } from "@dafne/contracts";
import { CHANGELOG_MESSAGES } from "@dafne/frontend-changelog";
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
import { ASSISTANT_PROVIDERS_MESSAGES } from "@dafne/frontend-assistant/assistant-providers";
import { ASSISTANT_MODELS_MESSAGES } from "@dafne/frontend-assistant/assistant-models";
import { ASSISTANT_CHAT_MESSAGES } from "@dafne/frontend-assistant/chat";
import { ASSISTANT_AGENTS_MESSAGES } from "@dafne/frontend-assistant/assistant-agents";
import { USER_GROUPS_MESSAGES } from "@dafne/frontend-user-groups";

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
      // History sheet texts, shipped by @dafne/frontend-changelog.
      changelog: CHANGELOG_MESSAGES[resolved],
      assistantProviders: ASSISTANT_PROVIDERS_MESSAGES[resolved],
      assistantModels: ASSISTANT_MODELS_MESSAGES[resolved],
      assistantAgents: ASSISTANT_AGENTS_MESSAGES[resolved],
      // The assistant panel, shipped by @dafne/frontend-assistant.
      assistantChat: ASSISTANT_CHAT_MESSAGES[resolved],
      userGroups: USER_GROUPS_MESSAGES[resolved],
    },
  };
});
