"use client";

import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";
import { useTranslations } from "next-intl";
import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { Button } from "@dafne/frontend-ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@dafne/frontend-ui/components/card";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveActivity } from "../actions";
import { activityFormOpts, activitySchema } from "../schema";
import { ActivityDetail } from "../types";
import { ACTIVITY_TYPE_OPTIONS } from "../activity-type-options";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { CalendarClockIcon, TagIcon, TextIcon } from "lucide-react";

/** Creates a activity, or edits `activity`. Saving opens its page. */
export function ActivityForm({ activity }: { activity?: ActivityDetail }) {
  const t = useTranslations();
  const typeOptions = useOptionLabels(ACTIVITY_TYPE_OPTIONS);
  const form = useAppForm({
    ...activityFormOpts(activity),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: activitySchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveActivity(activity?.id ?? null, value);
      if (result?.error) {
        setServerError(formApi, result.error);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = activity
    ? `/activities/${encodeURIComponent(activity.id)}`
    : "/activities";

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

          <DetailSection title={t("activities.sections.details")} groupVariant="grid">
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t("activities.fields.name")}
                  autoComplete="off"
                  autoFocus
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="type">
              {(field) => (
                <field.SelectField
                  label={t("activities.fields.type")}
                  options={typeOptions}
                  disabled={!!activity}
                >
                  <InputGroupAddon>
                    <TagIcon />
                  </InputGroupAddon>
                </field.SelectField>
              )}
            </form.AppField>
            <form.AppField name="dueDate">
              {(field) => (
                <field.DateTimePickerField
                  label={t("activities.fields.dueDate")}
                  icon={CalendarClockIcon}
                />
              )}
            </form.AppField>
            <form.AppField name="notes">
              {(field) => (
                <field.TextEditorField
                  label={t("activities.fields.notes")}
                  className="col-span-2"
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
              label={t(activity ? "common.saveChanges" : "activities.create")}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
