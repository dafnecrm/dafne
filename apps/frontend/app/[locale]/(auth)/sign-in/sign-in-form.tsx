"use client";

import { useTranslations } from "next-intl";
import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { authClient, useAuthErrorMessage } from "@dafne/frontend-auth/client";
import { signInFormOpts, signInSchema } from "../schemas";
import { VERIFY_EMAIL_PATH } from "../verify-email/verify-email";

export function SignInForm() {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const t = useTranslations("auth");
  const authErrorMessage = useAuthErrorMessage();

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
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);

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
                label={t("fields.email")}
                type="email"
                autoComplete="email"
                placeholder={t("fields.emailPlaceholder")}
              />
            )}
          </form.AppField>
          <form.AppField name="password">
            {(field) => (
              <field.PasswordField
                label={t("fields.password")}
                autoComplete="current-password"
              />
            )}
          </form.AppField>
          <form.AppField name="rememberMe">
            {(field) => <field.CheckboxField label={t("fields.rememberMe")} />}
          </form.AppField>
          <form.SubmitButton
            label={t("signIn.submit")}
            pending={navigating}
            className="w-full"
          />
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
