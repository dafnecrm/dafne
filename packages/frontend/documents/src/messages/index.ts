import * as en from "./en.ts";
import * as it from "./it.ts";

export type {
  DocumentsMessages,
  DocumentTemplatesMessageKey,
  DocumentTemplatesMessages,
} from "./en.ts";

/*
 * The document texts, by language. Each app merges them in its next-intl
 * messages (i18n/request.ts) and in its `Messages` type (i18n/global.d.ts):
 * DOCUMENT_TEMPLATES_MESSAGES under `documentTemplates`, DOCUMENTS_MESSAGES
 * under `documents`.
 */
export const DOCUMENT_TEMPLATES_MESSAGES = { en: en.documentTemplates, it: it.documentTemplates };
export const DOCUMENTS_MESSAGES = { en: en.documents, it: it.documents };
export type DocumentsLocale = keyof typeof DOCUMENTS_MESSAGES;
