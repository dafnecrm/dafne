import { en } from "./en.ts";
import { it } from "./it.ts";

export type { UsersMessageKey, UsersMessages } from "./en.ts";

/**
 * The user texts, by language. Each app merges them under `users` in its
 * next-intl messages (i18n/request.ts) and in its `Messages` type
 * (i18n/global.d.ts).
 */
export const USERS_MESSAGES = { en, it };
export type UsersLocale = keyof typeof USERS_MESSAGES;
