import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

// Validation for the sign-in and sign-up forms.

// Messages are message keys, translated where they are shown.
const email = z.email({ error: "auth.validation.email" }).max(255);

export const signInSchema = z.object({
  email,
  // No strength rules here: existing accounts may have older passwords.
  password: z.string().min(1, { error: "auth.validation.password" }),
  rememberMe: z.boolean().optional(),
});

export const signUpSchema = z.object({
  // Max 127 each: the backend stores "first last" in a varchar(255).
  firstname: z
    .string()
    .trim()
    .min(1, { error: "auth.validation.firstname" })
    .max(127),
  lastname: z
    .string()
    .trim()
    .min(1, { error: "auth.validation.lastname" })
    .max(127),
  email,
  password: z
    .string()
    .max(128) // backend limit
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/, {
      error: "auth.validation.passwordRules",
    }),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;

export const signInFormOpts = formOptions({
  defaultValues: { email: "", password: "", rememberMe: false } as SignInValues,
});

export const signUpFormOpts = formOptions({
  defaultValues: {
    firstname: "",
    lastname: "",
    email: "",
    password: "",
  } as SignUpValues,
});
