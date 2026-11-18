import { en } from "./en.ts";
import { it } from "./it.ts";

export type {
  AssistantModelsMessageKey,
  AssistantModelsMessages,
} from "./en.ts";

/**
 * The assistant model texts, by language. Each app merges them under
 * `assistantModels` in its next-intl messages (i18n/request.ts) and in its
 * `Messages` type (i18n/global.d.ts).
 */
export const ASSISTANT_MODELS_MESSAGES = { en, it };
export type AssistantModelsLocale = keyof typeof ASSISTANT_MODELS_MESSAGES;
