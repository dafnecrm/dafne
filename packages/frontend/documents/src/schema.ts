import { formOptions } from "@tanstack/react-form-nextjs";
import {
  documentTemplateBodySchema,
  LANGUAGES,
  type DocumentTemplateBody,
  type Language,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { DocumentTemplateDetail } from "./types.ts";

/**
 * Form values: every field is text, "" when blank, except the language
 * (picked from a list) and isDefault. Keys follow the contract.
 */
export type DocumentTemplateFormValues = Record<
  Exclude<keyof DocumentTemplateBody, "isDefault" | "language">,
  string
> & {
  language: Language;
  isDefault: boolean;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const documentTemplateSchema = formSchema<DocumentTemplateFormValues>()(
  documentTemplateBodySchema,
);

/**
 * Form values for a new document template (in `language`, the user's, when
 * it is one of LANGUAGES), or for editing `documentTemplate`.
 */
export function documentTemplateFormOpts(
  documentTemplate?: DocumentTemplateDetail,
  language?: string,
) {
  return formOptions({
    defaultValues: {
      name: documentTemplate?.name ?? "",
      resource: documentTemplate?.resource ?? "",
      language:
        documentTemplate?.language ??
        LANGUAGES.find((option) => option === language) ??
        LANGUAGES[0],
      isDefault: documentTemplate?.isDefault ?? false,
    } satisfies DocumentTemplateFormValues as DocumentTemplateFormValues,
  });
}
