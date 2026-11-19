import { en } from "./en.ts";
import { it } from "./it.ts";

export type { UomConversionsMessageKey, UomConversionsMessages } from "./en.ts";

/**
 * The uom conversion texts, by language. Each app merges them under
 * `uomConversions` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const UOM_CONVERSIONS_MESSAGES = { en, it };
export type UomConversionsLocale = keyof typeof UOM_CONVERSIONS_MESSAGES;
