import { en } from "./en.ts";
import { it } from "./it.ts";

export type {
  SalesOrderTypesMessageKey,
  SalesOrderTypesMessages,
} from "./en.ts";

/**
 * The sales order type texts, by language. Each app merges them under
 * `salesOrderTypes` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const SALES_ORDER_TYPES_MESSAGES = { en, it };
export type SalesOrderTypesLocale = keyof typeof SALES_ORDER_TYPES_MESSAGES;
