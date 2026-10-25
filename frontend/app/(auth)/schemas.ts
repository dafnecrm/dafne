import { formOptions, type ServerFormState } from "@tanstack/react-form-nextjs";
import { z } from "zod";

// Shared by the forms (client validation) and the server actions.

const email = z.email({ error: "Enter a valid email address" }).max(255);

export const signInSchema = z.object({
  email,
  // No strength rules here: existing accounts may have older passwords.
  password: z.string().min(1, { error: "Enter your password" }),
  rememberMe: z.boolean().optional(),
});

export const signUpSchema = z.object({
  // Max 127 each: the backend stores "first last" in a varchar(255).
  firstname: z.string().trim().min(1, { error: "Enter your first name" }).max(127),
  lastname: z.string().trim().min(1, { error: "Enter your last name" }).max(127),
  email,
  password: z
    .string()
    .max(128) // backend limit
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/, {
      error:
        "Password must contain minimum 8 characters, at least one uppercase letter, one lowercase letter, one number and one special character",
    }),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;

export const signInFormOpts = formOptions({
  defaultValues: { email: "", password: "", rememberMe: false } as SignInValues,
});

export const signUpFormOpts = formOptions({
  defaultValues: { firstname: "", lastname: "", email: "", password: "" } as SignUpValues,
});

/** State returned by the auth actions; `errorMap.onServer` holds server errors. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthFormState = ServerFormState<any, any>;
