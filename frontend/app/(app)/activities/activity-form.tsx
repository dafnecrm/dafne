"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { useResetOnLeave } from "@/lib/app-form/reset-on-leave";
import type { ActivityDetail } from "@/lib/activities";
import { saveActivity } from "./actions";
import { activityFormOpts, activitySchema, TYPE_OPTIONS } from "./schema";

/** Creates a activity, or edits `activity`. Saving opens its page. */
export function ActivityForm({ activity }: { activity?: ActivityDetail }) {
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
                <h2>Details</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <form.AppField name="name">
                  {(field) => (
                    <field.TextField
                      label="Name"
                      autoComplete="off"
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="type">
                  {(field) => (
                    <field.SelectField label="Type" options={TYPE_OPTIONS} />
                  )}
                </form.AppField>
                <form.AppField name="notes">
                  {(field) => (
                    <field.TextEditorField label="Notes (optional)" />
                  )}
                </form.AppField>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              Cancel
            </Button>
            <form.SubmitButton
              label={activity ? "Save changes" : "Create activity"}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
