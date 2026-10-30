"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { useResetOnLeave } from "@/lib/app-form/reset-on-leave";
import type { TaskDetail } from "@/lib/tasks";
import { activityHref } from "@/lib/tasks-table";
import { saveTask } from "./actions";
import { taskFormOpts, taskSchema, TYPE_OPTIONS } from "./schema";

/**
 * Creates a task of `activityId`, or edits `task`. The activity isn't an
 * input: it comes from the page. Saving opens the task's page.
 */
export function TaskForm({
  task,
  activityId,
}: { task: TaskDetail; activityId?: never } | { task?: never; activityId: string }) {
  const form = useAppForm({
    ...taskFormOpts(task, activityId),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: taskSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveTask(task?.id ?? null, value);
      if (result?.error) setServerError(formApi, result.error);
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = task
    ? `/tasks/${encodeURIComponent(task.id)}`
    : activityHref(activityId);

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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <form.AppField name="name">
                  {(field) => (
                    <field.TextField
                      label="Name"
                      autoComplete="off"
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="dueDate">
                  {(field) => (
                    <field.DateTimePickerField label="Due date" />
                  )}
                </form.AppField>
                <form.AppField name="notes">
                  {(field) => <field.TextEditorField label="Notes" />}
                </form.AppField>
                <form.AppField name="type">
                  {(field) => (
                    <field.SelectField label="Type" options={TYPE_OPTIONS} />
                  )}
                </form.AppField>
                {/* dafne-ignore: activityId */}
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
            <form.SubmitButton label={task ? "Save changes" : "Create task"} />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
