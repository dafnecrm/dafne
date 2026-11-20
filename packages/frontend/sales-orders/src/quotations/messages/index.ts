import { en } from "./en.ts";
import { it } from "./it.ts";

export type { QuotationsMessageKey, QuotationsMessages } from "./en.ts";

/**
 * The quotation texts, by language. Each app merges them under
 * `quotations` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const QUOTATIONS_MESSAGES = { en, it };
export type QuotationsLocale = keyof typeof QUOTATIONS_MESSAGES;
