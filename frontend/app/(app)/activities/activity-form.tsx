"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { ListPlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { useResetOnLeave } from "@/lib/app-form/reset-on-leave";
import type { ActivityDetail } from "@/lib/activities";
import { TASK_TYPE_OPTIONS } from "@/lib/tasks-table";
import { saveActivity } from "./actions";
import {
  activityFormOpts,
  activitySchema,
  emptyTask,
  TYPE_OPTIONS,
} from "./schema";

/**
 * Creates a activity, or edits `activity`. Its tasks are saved together
 * with the rest: removed ones are deleted. Saving opens its page.
 */
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

          <form.AppField name="tasks" mode="array">
            {(tasks) => (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>Tasks</h2>
                  </CardTitle>
                  <CardDescription>
                    {tasks.state.value.length
                      ? "Saved with the activity; removed tasks are deleted."
                      : "No tasks yet."}
                  </CardDescription>
                  <CardAction>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => tasks.pushValue({ ...emptyTask })}
                    >
                      <ListPlusIcon data-icon="inline-start" />
                      Add task
                    </Button>
                  </CardAction>
                </CardHeader>
                {tasks.state.value.length > 0 && (
                  <CardContent className="flex flex-col gap-6">
                    {tasks.state.value.map((task, i) => (
                      // TanStack Form tracks array items by index; existing
                      // tasks also keep their id.
                      <fieldset
                        key={task.id ?? `new-${i}`}
                        className="flex flex-col gap-4 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <legend className="font-medium">
                            {task.id ? `Task ${i + 1}` : `New task ${i + 1}`}
                          </legend>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => tasks.removeValue(i)}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <form.AppField name={`tasks[${i}].name`}>
                            {(field) => (
                              <field.TextField label="Name" autoComplete="off" />
                            )}
                          </form.AppField>
                          <form.AppField name={`tasks[${i}].type`}>
                            {(field) => (
                              <field.SelectField
                                label="Type"
                                options={TASK_TYPE_OPTIONS}
                              />
                            )}
                          </form.AppField>
                          <form.AppField name={`tasks[${i}].dueDate`}>
                            {(field) => (
                              <field.DateTimePickerField label="Due date" />
                            )}
                          </form.AppField>
                          <form.AppField name={`tasks[${i}].notes`}>
                            {(field) => (
                              <field.TextEditorField
                                label="Notes"
                                className="md:col-span-3"
                              />
                            )}
                          </form.AppField>
                        </div>
                      </fieldset>
                    ))}
                  </CardContent>
                )}
              </Card>
            )}
          </form.AppField>

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
