import { formOptions } from "@tanstack/react-form-nextjs";
import {
  activityBodySchema,
  type ActivityBody,
  type ActivityTaskBody,
  type ActivityType,
  type TaskType,
} from "@backend/contracts";
import { formSchema } from "@/lib/app-form/form-schema";
import type { ActivityDetail } from "@/lib/activities";

/**
 * A task of the form: text values, except its type. `id` is set for the
 * activity's existing tasks and missing for new ones.
 */
export type ActivityTaskFormValues = Record<
  Exclude<keyof ActivityTaskBody, "type" | "id">,
  string
> & { type: TaskType; id?: string };

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type ActivityFormValues = Record<
  Exclude<keyof ActivityBody, "type" | "tasks">,
  string
> & {
  type: ActivityType;
  tasks: ActivityTaskFormValues[];
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const activitySchema =
  formSchema<ActivityFormValues>()(activityBodySchema);

export const TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
] satisfies { value: ActivityType; label: string }[];

export const emptyTask: ActivityTaskFormValues = {
  name: "",
  dueDate: "",
  type: "email",
  notes: "",
};

/** Form values for a new activity, or for editing `activity`. */
export function activityFormOpts(activity?: ActivityDetail) {
  return formOptions({
    defaultValues: {
      name: activity?.name ?? "",
      type: activity?.type ?? "email",
      notes: activity?.notes ?? "",
      tasks:
        activity?.tasks.map((t) => ({
          id: t.id,
          name: t.name,
          // What the DateTimePickerField shows ("2026-10-29T10:30").
          dueDate: t.dueDate.slice(0, 16),
          type: t.type,
          notes: t.notes,
        })) ?? [],
    } satisfies ActivityFormValues as ActivityFormValues,
  });
}
