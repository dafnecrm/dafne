"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FieldGroup } from "@/components/ui/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { signInFormOpts, signInSchema } from "../schemas";
import { VERIFY_EMAIL_PATH } from "../verify-email/verify-email";

export function SignInForm() {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();

  const form = useAppForm({
    ...signInFormOpts,
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signInSchema },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
        rememberMe: value.rememberMe === true,
        // Used by the new verification link sent when the email isn't verified.
        callbackURL: VERIFY_EMAIL_PATH,
      });
      if (error?.code === "EMAIL_NOT_VERIFIED") {
        // The backend just emailed a fresh link.
        startTransition(() => {
          router.push(
            `${VERIFY_EMAIL_PATH}?email=${encodeURIComponent(value.email)}`,
          );
        });
        return;
      }
      if (error) {
        setServerError(formApi, authErrorMessage(error));
        return;
      }
      // Better Auth set the session cookie; load the app with it.
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
                autoComplete="current-password"
              />
            )}
          </form.AppField>
          <form.AppField name="rememberMe">
            {(field) => <field.CheckboxField label="Remember me" />}
          </form.AppField>
          <form.SubmitButton
            label="Sign in"
            pending={navigating}
            className="w-full"
          />
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
