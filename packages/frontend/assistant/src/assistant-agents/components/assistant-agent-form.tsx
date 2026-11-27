"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@dafne/frontend-ui/components/field";
import { RadioGroup, RadioGroupItem } from "@dafne/frontend-ui/components/radio-group";
import type { AssistantAgentAudience } from "@dafne/contracts";
import { GroupMultiSelect, type GroupOption } from "./group-multi-select.tsx";
import { setServerError, useAppForm, useErrorText } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveAssistantAgent } from "../actions.ts";
import {
  assistantAgentFormOpts,
  assistantAgentSchema,
  TOOL_GROUPS,
} from "../schema.ts";
import { Checkbox } from "@dafne/frontend-ui/components/checkbox";
import type { AssistantAgentDetail } from "../types.ts";
import { TextIcon } from "lucide-react";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";

/**
 * Creates an assistant agent, or edits `assistantAgent`. Saving opens the assistant agent's page
 * (`<path>/<id>`, `path` being the app's assistant agents list).
 */
export function AssistantAgentForm({
  assistantAgent,
  models,
  groups,
  path,
}: {
  assistantAgent?: AssistantAgentDetail;
  /** The models to pick the default from. */
  models: { id: number; label: string }[];
  /** The user groups it can be opened to. */
  groups: GroupOption[];
  path: string;
}) {
  const errorText = useErrorText();
  const t = useTranslations();
  const form = useAppForm({
    ...assistantAgentFormOpts(assistantAgent),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: assistantAgentSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveAssistantAgent(
        assistantAgent?.id ?? null,
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
  const cancelHref = assistantAgent
    ? `${path}/${encodeURIComponent(assistantAgent.id)}`
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
            title={t("assistantAgents.sections.details")}
            groupVariant="grid"
          >
            {/* The fields: dafne g/sync add one <form.AppField> per field of the contract's body. */}
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t("assistantAgents.fields.name")}
                  autoComplete="off"
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="description">
              {(field) => (
                <field.TextareaField
                  label={t("assistantAgents.fields.description")}
                  className="col-span-full"
                />
              )}
            </form.AppField>
            <form.AppField name="systemPrompt">
              {(field) => (
                <field.TextareaField
                  label={t("assistantAgents.fields.systemPrompt")}
                  className="col-span-full"
                />
              )}
            </form.AppField>
            <FieldDescription className="col-span-full -mt-4">
              {t("assistantAgents.hints.systemPrompt")}
            </FieldDescription>
            <form.AppField name="defaultModelId">
              {(field) => (
                <field.SelectField
                  label={t("assistantAgents.fields.defaultModelId")}
                  emptyLabel={t("assistantAgents.noModel")}
                  options={models.map((model) => ({
                    value: String(model.id),
                    label: model.label,
                  }))}
                />
              )}
            </form.AppField>
            <form.AppField name="allowModelOverride">
              {(field) => (
                <field.CheckboxField
                  label={t("assistantAgents.fields.allowModelOverride")}
                />
              )}
            </form.AppField>
            <form.AppField name="enabled">
              {(field) => (
                <field.CheckboxField
                  label={t("assistantAgents.fields.enabled")}
                />
              )}
            </form.AppField>
          </DetailSection>

          <DetailSection title={t("assistantAgents.sections.audience")}>
            <form.Field name="audience">
              {(field) => (
                <RadioGroup
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as AssistantAgentAudience)}
                  className="grid gap-2"
                >
                  {(["everyone", "groups"] as const).map((audience) => (
                    <label key={audience} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={audience} />
                      {t(`assistantAgents.audience.${audience}`)}
                    </label>
                  ))}
                </RadioGroup>
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.values.audience}>
              {(audience) =>
                audience === "groups" && (
                  <form.Field name="groupIds">
                    {(field) => (
                      <Field data-invalid={!field.state.meta.isValid}>
                        <FieldLabel htmlFor={field.name}>{t("assistantAgents.fields.groupIds")}</FieldLabel>
                        <GroupMultiSelect
                          id={field.name}
                          groups={groups}
                          value={field.state.value}
                          onValueChange={field.handleChange}
                          placeholder={t("assistantAgents.audience.pick")}
                          emptyText={t("assistantAgents.audience.noGroups")}
                          aria-invalid={!field.state.meta.isValid}
                        />
                        <FieldError>
                          {field.state.meta.errors.length > 0 && errorText(field.state.meta.errors).map((message, i) => <p key={i}>{message}</p>)}
                        </FieldError>
                        <FieldDescription>{t("assistantAgents.hints.audience")}</FieldDescription>
                      </Field>
                    )}
                  </form.Field>
                )
              }
            </form.Subscribe>
          </DetailSection>

          <DetailSection title={t("assistantAgents.sections.tools")}>
            <FieldDescription>{t("assistantAgents.hints.tools")}</FieldDescription>
            <form.Field name="tools">
              {(field) => (
                <div className="grid gap-6 sm:grid-cols-2">
                  {TOOL_GROUPS.map(({ group, tools }) => (
                    <fieldset key={group} className="grid gap-2">
                      <legend className="mb-2 text-sm font-medium">
                        {t(`assistantAgents.toolGroups.${group}`)}
                      </legend>
                      {tools.map((tool) => (
                        <label key={tool} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={field.state.value.includes(tool)}
                            onCheckedChange={(checked) =>
                              field.handleChange(
                                checked
                                  ? [...field.state.value, tool]
                                  : field.state.value.filter((t) => t !== tool),
                              )
                            }
                          />
                          {t(`assistantAgents.tools.${tool}`)}
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </div>
              )}
            </form.Field>
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
                assistantAgent
                  ? "common.saveChanges"
                  : "assistantAgents.create",
              )}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
