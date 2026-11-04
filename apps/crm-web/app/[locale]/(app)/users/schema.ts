import type { MessageKey } from "@dafne/frontend-ui/lib/message-key";
import { formOptions } from "@tanstack/react-form-nextjs";
import {
  createUserBodySchema,
  type CreateUserBody,
  type UserRole,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";

/** Form values: text fields as strings, the role from ROLE_OPTIONS. */
export type UserFormValues = Record<
  Exclude<keyof CreateUserBody, "role">,
  string
> & { role: UserRole };

/** The form validates with the backend's own schema (same rules and messages). */
export const userSchema = formSchema<UserFormValues>()(createUserBodySchema);

/** The roles, for the form's select (labels are message keys). */
export const ROLE_OPTIONS = [
  { value: "user", label: "users.role.user" },
  { value: "admin", label: "users.role.admin" },
] satisfies { value: UserRole; label: MessageKey }[];

export const userFormOpts = formOptions({
  defaultValues: {
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    role: "user",
  } satisfies UserFormValues as UserFormValues,
});
