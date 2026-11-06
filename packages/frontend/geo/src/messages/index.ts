import { en } from "./en.ts";
import { it } from "./it.ts";

export type { GeoMessages } from "./en.ts";

/**
 * The geo texts, by language. Each app merges them under `geo` in its
 * next-intl messages (i18n/request.ts) and its `Messages` type
 * (i18n/global.d.ts).
 */
export const GEO_MESSAGES = { en, it };
