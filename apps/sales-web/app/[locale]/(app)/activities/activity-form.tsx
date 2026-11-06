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
import type { ActivityDetail } from "@/lib/activities";
import { saveActivity } from "./actions";
import { activityFormOpts, activitySchema, TYPE_OPTIONS } from "./schema";

/** Creates a activity, or edits `activity`. Saving opens its page. */
export function ActivityForm({ activity }: { activity?: ActivityDetail }) {
  const t = useTranslations();
  const typeOptions = useOptionLabels(TYPE_OPTIONS);
  const form = useAppForm({
    ...activityFormOpts(activity),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: activitySchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveActivity(activity?.id ?? null, value);
      if (result?.error) setServerError(formApi, result.error);
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
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("activities.sections.details")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <form.AppField name="name">
                  {(field) => (
                    <field.TextField
                      label={t("activities.fields.name")}
                      autoComplete="off"
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="type">
                  {(field) => (
                    <field.SelectField
                      label={t("activities.fields.type")}
                      options={typeOptions}
                      disabled={!!activity}
                    />
                  )}
                </form.AppField>
                <form.AppField name="dueDate">
                  {(field) => (
                    <field.DateTimePickerField
                      label={t("activities.fields.dueDate")}
                    />
                  )}
                </form.AppField>
                <form.AppField name="notes">
                  {(field) => (
                    <field.TextEditorField
                      label={t("activities.fields.notes")}
                      controlClassName="col-span-2"
                    />
                  )}
                </form.AppField>
              </FieldGroup>
            </CardContent>
          </Card>

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
