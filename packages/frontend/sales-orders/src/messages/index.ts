import { en } from "./en.ts";
import { it } from "./it.ts";

export type { SalesOrdersMessageKey, SalesOrdersMessages } from "./en.ts";

/**
 * The sales order texts, by language. Each app merges them under
 * `salesOrders` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const SALES_ORDERS_MESSAGES = { en, it };
export type SalesOrdersLocale = keyof typeof SALES_ORDERS_MESSAGES;
