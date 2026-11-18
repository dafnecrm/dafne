"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveAssistantProvider } from "../actions.ts";
import {
  assistantProviderFormOpts,
  assistantProviderSchema,
  KIND_OPTIONS,
} from "../schema.ts";
import type { AssistantProviderDetail } from "../types.ts";
import { TextIcon, TagIcon } from "lucide-react";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";

/**
 * Creates an assistant provider, or edits `assistantProvider`. Saving opens the assistant provider's page
 * (`<path>/<id>`, `path` being the app's assistant providers list).
 */
export function AssistantProviderForm({
  assistantProvider,
  path,
}: {
  assistantProvider?: AssistantProviderDetail;
  path: string;
}) {
  const t = useTranslations();
  const kindOptions = useOptionLabels(KIND_OPTIONS);
  const form = useAppForm({
    ...assistantProviderFormOpts(assistantProvider),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: assistantProviderSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveAssistantProvider(
        assistantProvider?.id ?? null,
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
  const cancelHref = assistantProvider
    ? `${path}/${encodeURIComponent(assistantProvider.id)}`
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
            title={t("assistantProviders.sections.details")}
            groupVariant="grid"
          >
            {/* The fields: dafne g/sync add one <form.AppField> per field of the contract's body. */}
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t("assistantProviders.fields.name")}
                  autoComplete="off"
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="kind">
              {(field) => (
                <field.SelectField
                  label={t("assistantProviders.fields.kind")}
                  options={kindOptions}
                >
                  <InputGroupAddon>
                    <TagIcon />
                  </InputGroupAddon>
                </field.SelectField>
              )}
            </form.AppField>
            <form.AppField name="baseUrl">
              {(field) => (
                <field.TextField
                  label={t("assistantProviders.fields.baseUrl")}
                  autoComplete="off"
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="apiKeyEnv">
              {(field) => (
                <field.TextField
                  label={t("assistantProviders.fields.apiKeyEnv")}
                  autoComplete="off"
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="enabled">
              {(field) => (
                <field.CheckboxField
                  label={t("assistantProviders.fields.enabled")}
                />
              )}
            </form.AppField>
          </DetailSection>

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
                assistantProvider
                  ? "common.saveChanges"
                  : "assistantProviders.create",
              )}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
