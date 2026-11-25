"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LANGUAGES } from "@dafne/contracts";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import type { DocumentResource, DocumentTemplateDetail } from "../types.ts";
import { DocumentTemplatePlaceholders } from "./document-template-placeholders.tsx";
import { useResourceLabel } from "./use-resource-label.ts";
import { saveDocumentTemplate } from "../actions.ts";
import { documentTemplateFormOpts, documentTemplateSchema } from "../schema.ts";
import { FileTextIcon, LanguagesIcon, TextIcon } from "lucide-react";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";

/**
 * Creates a document template, or edits `documentTemplate`, for one of
 * `resources` (what the API makes documents for). Saving opens its page
 * (`<path>/<id>`, `path` being the app's document templates list), where
 * its Word file is uploaded.
 */
export function DocumentTemplateForm({
  documentTemplate,
  resources,
  path,
}: {
  documentTemplate?: DocumentTemplateDetail;
  resources: DocumentResource[];
  path: string;
}) {
  const t = useTranslations();
  const resourceLabel = useResourceLabel();
  const resourceOptions = resources.map(({ resource }) => ({ value: resource, label: resourceLabel(resource) }));
  const languageOptions = LANGUAGES.map((language) => ({ value: language, label: t(`documentTemplates.languages.${language}`) }));
  const form = useAppForm({
    ...documentTemplateFormOpts(documentTemplate, useLocale()),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: documentTemplateSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveDocumentTemplate(
        documentTemplate?.id ?? null,
        value,
        path,
      );
      if (result?.error) {
        setServerError(formApi, result.error);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = documentTemplate
    ? `${path}/${encodeURIComponent(documentTemplate.id)}`
    : path;

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
            <form.AppField name="language">
              {(field) => (
                <field.SelectField
                  label={t("documentTemplates.fields.language")}
                  options={languageOptions}
                >
                  <InputGroupAddon>
                    <LanguagesIcon />
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
