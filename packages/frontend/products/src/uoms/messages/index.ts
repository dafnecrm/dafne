import { en } from "./en.ts";
import { it } from "./it.ts";

export type { UomsMessageKey, UomsMessages } from "./en.ts";

/**
 * The uom texts, by language. Each app merges them under
 * `uoms` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const UOMS_MESSAGES = { en, it };
export type UomsLocale = keyof typeof UOMS_MESSAGES;
