import { formOptions } from "@tanstack/react-form-nextjs";
import {
  activityBodySchema,
  type ActivityBody,
  type ActivityStatus,
  type ActivityType,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { ActivityDetail } from "./types";

/**
 * Form values: every field is text, "" when blank. Keys follow the
 * contract. `status` has no field: it keeps the activity's own, so saving
 * doesn't move it (closing and reopening are actions of their own).
 */
export type ActivityFormValues = Record<
  Exclude<keyof ActivityBody, "type" | "status">,
  string
> & {
  type: ActivityType;
  status: ActivityStatus;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const activitySchema =
  formSchema<ActivityFormValues>()(activityBodySchema);

/** Form values for a new activity, or for editing `activity`. */
export function activityFormOpts(activity?: ActivityDetail) {
  return formOptions({
    defaultValues: {
      name: activity?.name ?? "",
      type: activity?.type ?? "email",
      notes: activity?.notes ?? "",
      dueDate: activity?.dueDate ?? "",
      status: activity?.status ?? "open",
    } satisfies ActivityFormValues as ActivityFormValues,
  });
}
