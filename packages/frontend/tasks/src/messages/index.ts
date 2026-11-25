import { en } from "./en.ts";
import { it } from "./it.ts";

export type { TasksMessageKey, TasksMessages } from "./en.ts";

/**
 * The scheduled tasks texts, by language. Each app merges them under
 * `tasks` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const TASKS_MESSAGES = { en, it };
export type TasksLocale = keyof typeof TASKS_MESSAGES;
