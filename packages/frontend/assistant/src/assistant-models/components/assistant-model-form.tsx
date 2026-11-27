"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { FieldDescription, FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveAssistantModel } from "../actions.ts";
import {
  assistantModelFormOpts,
  assistantModelSchema,
  REASONING_OPTIONS,
} from "../schema.ts";
import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";
import type { AssistantModelDetail } from "../types.ts";
import { TextIcon } from "lucide-react";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";

/**
 * Creates an assistant model, or edits `assistantModel`. Saving opens the assistant model's page
 * (`<path>/<id>`, `path` being the app's assistant models list).
 */
export function AssistantModelForm({
  assistantModel,
  providers,
  path,
}: {
  assistantModel?: AssistantModelDetail;
  /** The providers to pick from. */
  providers: { id: number; name: string }[];
  path: string;
}) {
  const t = useTranslations();
  const reasoningOptions = useOptionLabels(REASONING_OPTIONS);
  const form = useAppForm({
    ...assistantModelFormOpts(assistantModel),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: assistantModelSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveAssistantModel(
        assistantModel?.id ?? null,
        value,
        path,
      );
      if (result?.error) {
        setServerError(formApi, result);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = assistantModel
    ? `${path}/${encodeURIComponent(assistantModel.id)}`
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
            title={t("assistantModels.sections.details")}
            groupVariant="grid"
          >
            {/* The fields: dafne g/sync add one <form.AppField> per field of the contract's body. */}
            <form.AppField name="providerId">
              {(field) => (
                <field.SelectField
                  label={t("assistantModels.fields.providerId")}
                  options={providers.map((provider) => ({
                    value: String(provider.id),
                    label: provider.name,
                  }))}
                />
              )}
            </form.AppField>
            <form.AppField name="modelId">
              {(field) => (
                <field.TextField
                  label={t("assistantModels.fields.modelId")}
                  autoComplete="off"
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="label">
              {(field) => (
                <field.TextField
                  label={t("assistantModels.fields.label")}
                  autoComplete="off"
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <FieldDescription className="col-span-full -mt-4">
              {t("assistantModels.hints.modelId")}
            </FieldDescription>
            <form.AppField name="supportsTools">
              {(field) => (
                <field.CheckboxField
                  label={t("assistantModels.fields.supportsTools")}
                />
              )}
            </form.AppField>
            <form.AppField name="enabled">
              {(field) => (
                <field.CheckboxField
                  label={t("assistantModels.fields.enabled")}
                />
              )}
            </form.AppField>
          </DetailSection>

          <DetailSection
            title={t("assistantModels.sections.options")}
            groupVariant="grid"
          >
            <form.AppField name="reasoning">
              {(field) => (
                <field.SelectField
                  label={t("assistantModels.fields.reasoning")}
                  options={reasoningOptions}
                />
              )}
            </form.AppField>
            <form.AppField name="temperature">
              {(field) => (
                <field.TextField
                  label={t("assistantModels.fields.temperature")}
                  inputMode="decimal"
                  autoComplete="off"
                />
              )}
            </form.AppField>
            <FieldDescription className="col-span-full -mt-4">
              {t("assistantModels.hints.reasoning")}{" "}
              {t("assistantModels.hints.temperature")}
            </FieldDescription>
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
                assistantModel
                  ? "common.saveChanges"
                  : "assistantModels.create",
              )}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
