import { en } from "./en.ts";
import { it } from "./it.ts";

export type {
  AssistantAgentsMessageKey,
  AssistantAgentsMessages,
} from "./en.ts";

/**
 * The assistant agent texts, by language. Each app merges them under
 * `assistantAgents` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const ASSISTANT_AGENTS_MESSAGES = { en, it };
export type AssistantAgentsLocale = keyof typeof ASSISTANT_AGENTS_MESSAGES;
