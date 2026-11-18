import { en } from "./en.ts";
import { it } from "./it.ts";

export type { AssistantChatMessages } from "./en.ts";

/**
 * The assistant panel's texts, by language. Each app merges them under
 * `assistantChat` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const ASSISTANT_CHAT_MESSAGES = { en, it };
