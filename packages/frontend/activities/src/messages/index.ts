import { en } from "./en.ts";
import { it } from "./it.ts";

export type { ActivitiesMessageKey, ActivitiesMessages } from "./en.ts";

/**
 * The activity texts, by language. Each app merges them under `activities`
 * in its next-intl messages (i18n/request.ts) and in its `Messages` type
 * (i18n/global.d.ts).
 */
export const ACTIVITIES_MESSAGES = { en, it };
export type ActivitiesLocale = keyof typeof ACTIVITIES_MESSAGES;
