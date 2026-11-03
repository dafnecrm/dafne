import { formOptions } from "@tanstack/react-form-nextjs";
import {
  createUserBodySchema,
  type CreateUserBody,
  type UserRole,
} from "@backend/contracts";
import { formSchema } from "@/lib/app-form/form-schema";

/** Form values: text fields as strings, the role from ROLE_OPTIONS. */
export type UserFormValues = Record<
  Exclude<keyof CreateUserBody, "role">,
  string
> & { role: UserRole };

/** The form validates with the backend's own schema (same rules and messages). */
export const userSchema = formSchema<UserFormValues>()(createUserBodySchema);

export const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
] satisfies { value: UserRole; label: string }[];

export const userFormOpts = formOptions({
  defaultValues: {
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    role: "user",
  } satisfies UserFormValues as UserFormValues,
});
