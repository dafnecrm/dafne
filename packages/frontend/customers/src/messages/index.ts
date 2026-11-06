import { en } from "./en.ts";
import { it } from "./it.ts";

export type { CustomersMessageKey, CustomersMessages } from "./en.ts";

/**
 * The customer texts, by language. Each app merges them under `customers`
 * in its next-intl messages (i18n/request.ts) and in its `Messages` type
 * (i18n/global.d.ts).
 */
export const CUSTOMERS_MESSAGES = { en, it };
export type CustomersLocale = keyof typeof CUSTOMERS_MESSAGES;
