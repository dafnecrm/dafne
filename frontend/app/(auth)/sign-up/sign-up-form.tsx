"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FieldGroup } from "@/components/ui/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { signUpFormOpts, signUpSchema } from "../schemas";

export function SignUpForm() {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();

  const form = useAppForm({
    ...signUpFormOpts,
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signUpSchema },
    onSubmit: async ({ value, formApi }) => {
      const firstname = value.firstname.trim();
      const lastname = value.lastname.trim();
      const { error } = await authClient.signUp.email({
        name: `${firstname} ${lastname}`,
        firstname,
        lastname,
        email: value.email,
        password: value.password,
      });
      if (error) {
        setServerError(formApi, authErrorMessage(error));
        return;
      }
      // Better Auth signed the new user in; load the app with the session.
      startTransition(() => {
        router.replace("/");
        router.refresh();
      });
    },
  });

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
          <div className="grid grid-cols-2 gap-3">
            <form.AppField name="firstname">
              {(field) => (
                <field.TextField label="First name" autoComplete="given-name" />
              )}
            </form.AppField>
            <form.AppField name="lastname">
              {(field) => (
                <field.TextField label="Last name" autoComplete="family-name" />
              )}
            </form.AppField>
          </div>
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
            )}
          </form.AppField>
          <form.AppField name="password">
            {(field) => (
              <field.PasswordField
                label="Password"
                autoComplete="new-password"
              />
            )}
          </form.AppField>
          <form.SubmitButton
            label="Create account"
            pending={navigating}
            className="w-full"
          />
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
