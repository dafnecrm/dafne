"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import type { DocumentResource, DocumentTemplateDetail } from "@/lib/document-templates";
import { DocumentTemplatePlaceholders } from "./document-template-placeholders";
import { useResourceLabel } from "./use-resource-label";
import { saveDocumentTemplate } from "./actions";
import { documentTemplateFormOpts, documentTemplateSchema } from "./schema";
import { FileTextIcon, TextIcon } from "lucide-react";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";

/**
 * Creates a document template, or edits `documentTemplate`, for one of
 * `resources` (what the API makes documents for). Saving opens its page,
 * where its Word file is uploaded.
 */
export function DocumentTemplateForm({
  documentTemplate,
  resources,
}: {
  documentTemplate?: DocumentTemplateDetail;
  resources: DocumentResource[];
}) {
  const t = useTranslations();
  const resourceLabel = useResourceLabel();
  const resourceOptions = resources.map(({ resource }) => ({ value: resource, label: resourceLabel(resource) }));
  const form = useAppForm({
    ...documentTemplateFormOpts(documentTemplate),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: documentTemplateSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveDocumentTemplate(
        documentTemplate?.id ?? null,
        value,
      );
      if (result?.error) {
        setServerError(formApi, result.error);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = documentTemplate
    ? `/document-templates/${encodeURIComponent(documentTemplate.id)}`
    : "/document-templates";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.AppForm>
        <FieldGroup>
          <form.FormErrors />

          <DetailSection
            title={t("documentTemplates.sections.details")}
            groupVariant="grid"
          >
            {/* The fields: dafne g/sync add one <form.AppField> per field of the contract's body. */}
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t("documentTemplates.fields.name")}
                  autoComplete="off"
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="resource">
              {(field) => (
                <field.SelectField
                  label={t("documentTemplates.fields.resource")}
                  options={resourceOptions}
                >
                  <InputGroupAddon>
                    <FileTextIcon />
                  </InputGroupAddon>
                </field.SelectField>
              )}
            </form.AppField>
            <form.AppField name="isDefault">
              {(field) => (
                <field.CheckboxField
                  label={t("documentTemplates.fields.isDefault")}
                />
              )}
            </form.AppField>
          </DetailSection>

          <form.Subscribe selector={(state) => state.values.resource}>
            {(resource) => (
              <DocumentTemplatePlaceholders
                placeholders={resources.find((option) => option.resource === resource)?.placeholders ?? null}
              />
            )}
          </form.Subscribe>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              {t("common.cancel")}
            </Button>
            <form.SubmitButton
              label={t(
                documentTemplate
                  ? "common.saveChanges"
                  : "documentTemplates.create",
              )}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
