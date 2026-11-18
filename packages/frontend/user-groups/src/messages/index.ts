import { en } from "./en.ts";
import { it } from "./it.ts";

export type { UserGroupsMessageKey, UserGroupsMessages } from "./en.ts";

/**
 * The user group texts, by language. Each app merges them under
 * `userGroups` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const USER_GROUPS_MESSAGES = { en, it };
export type UserGroupsLocale = keyof typeof USER_GROUPS_MESSAGES;
