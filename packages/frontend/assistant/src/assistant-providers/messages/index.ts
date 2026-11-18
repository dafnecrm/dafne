import { en } from "./en.ts";
import { it } from "./it.ts";

export type {
  AssistantProvidersMessageKey,
  AssistantProvidersMessages,
} from "./en.ts";

/**
 * The assistant provider texts, by language. Each app merges them under
 * `assistantProviders` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const ASSISTANT_PROVIDERS_MESSAGES = { en, it };
export type AssistantProvidersLocale =
  keyof typeof ASSISTANT_PROVIDERS_MESSAGES;
