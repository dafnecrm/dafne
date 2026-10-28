import { formOptions } from "@tanstack/react-form-nextjs";
import {
  activityBodySchema,
  type ActivityType,
  type ActivityBody,
} from "@backend/contracts";
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

export const TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
] satisfies { value: ActivityType; label: string }[];

/** Form values for a new activity, or for editing `activity`. */
export function activityFormOpts(activity?: ActivityDetail) {
  return formOptions({
    defaultValues: {
      name: activity?.name ?? "",
      type: activity?.type ?? "email",
    } satisfies ActivityFormValues as ActivityFormValues,
  });
}
