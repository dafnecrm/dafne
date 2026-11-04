import { formOptions } from "@tanstack/react-form-nextjs";
import {
  activityBodySchema,
  type ActivityBody,
  type ActivityType,
} from "@dafne/contracts";
import { formSchema } from "@/lib/app-form/form-schema";
import type { ActivityDetail } from "@/lib/activities";

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type ActivityFormValues = Record<
  Exclude<keyof ActivityBody, "type">,
  string
> & {
  type: ActivityType;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const activitySchema =
  formSchema<ActivityFormValues>()(activityBodySchema);

/** The activity types, for the form's select (labels are message keys). */
export { ACTIVITY_TYPE_OPTIONS as TYPE_OPTIONS } from "@/lib/activities-table";

/** Form values for a new activity, or for editing `activity`. */
export function activityFormOpts(activity?: ActivityDetail) {
  return formOptions({
    defaultValues: {
      name: activity?.name ?? "",
      type: activity?.type ?? "email",
      notes: activity?.notes ?? "",
      dueDate: activity?.dueDate?.slice(0, 16) ?? "",
    } satisfies ActivityFormValues as ActivityFormValues,
  });
}
