import { formOptions } from "@tanstack/react-form-nextjs";
import {
  documentTemplateBodySchema,
  type DocumentTemplateBody,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { DocumentTemplateDetail } from "@/lib/document-templates";

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type DocumentTemplateFormValues = Record<
  Exclude<keyof DocumentTemplateBody, "isDefault">,
  string
> & {
  isDefault: boolean;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const documentTemplateSchema = formSchema<DocumentTemplateFormValues>()(
  documentTemplateBodySchema,
);

/** Form values for a new document template, or for editing `documentTemplate`. */
export function documentTemplateFormOpts(
  documentTemplate?: DocumentTemplateDetail,
) {
  return formOptions({
    defaultValues: {
      name: documentTemplate?.name ?? "",
      resource: documentTemplate?.resource ?? "",
      isDefault: documentTemplate?.isDefault ?? false,
    } satisfies DocumentTemplateFormValues as DocumentTemplateFormValues,
  });
}
