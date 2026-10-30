import { formOptions } from "@tanstack/react-form-nextjs";
import {
  taskBodySchema,
  type TaskStatus,
  type TaskType,
  type TaskBody,
} from "@backend/contracts";
import { formSchema } from "@/lib/app-form/form-schema";
import type { TaskDetail } from "@/lib/tasks";

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type TaskFormValues = Record<
  Exclude<keyof TaskBody, "type" | "status">,
  string
> & {
  type: TaskType;
  status: TaskStatus;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const taskSchema = formSchema<TaskFormValues>()(taskBodySchema);

export const TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "other", label: "Other" },
] satisfies { value: TaskType; label: string }[];

export const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] satisfies { value: TaskStatus; label: string }[];

/** Form values for a new task of `activityId`, or for editing `task`. */
export function taskFormOpts(task?: TaskDetail, activityId = "") {
  return formOptions({
    defaultValues: {
      name: task?.name ?? "",
      dueDate: task?.dueDate?.slice(0, 16) ?? "",
      notes: task?.notes ?? "",
      type: task?.type ?? "email",
      activityId: task?.activityId ?? activityId,
      status: task?.status ?? "open",
    } satisfies TaskFormValues as TaskFormValues,
  });
}
