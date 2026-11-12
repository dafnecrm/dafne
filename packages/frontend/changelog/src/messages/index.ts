import { en } from "./en.ts";
import { it } from "./it.ts";

export type { ChangelogMessageKey, ChangelogMessages } from "./en.ts";

/**
 * The change log texts, by language. Each app merges them under
 * `changelog` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const CHANGELOG_MESSAGES = { en, it };
export type ChangelogLocale = keyof typeof CHANGELOG_MESSAGES;
