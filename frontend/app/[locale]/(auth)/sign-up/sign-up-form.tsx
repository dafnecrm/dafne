"use client";

import { useTranslations } from "next-intl";
import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FieldGroup } from "@/components/ui/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { useResetOnLeave } from "@/lib/app-form/reset-on-leave";
import { authClient, useAuthErrorMessage } from "@/lib/auth-client";
import { signUpFormOpts, signUpSchema } from "../schemas";
import { VERIFY_EMAIL_PATH } from "../verify-email/verify-email";

export function SignUpForm() {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const t = useTranslations("auth");
  const authErrorMessage = useAuthErrorMessage();

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
        // Where the link in the verification email lands.
        callbackURL: VERIFY_EMAIL_PATH,
      });
      if (error) {
        setServerError(formApi, authErrorMessage(error));
        return;
      }
      // No session until the email is verified: ask the user to check their inbox.
      startTransition(() => {
        router.replace(
          `${VERIFY_EMAIL_PATH}?email=${encodeURIComponent(value.email)}`,
        );
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
          <div className="grid grid-cols-2 gap-3">
            <form.AppField name="firstname">
              {(field) => (
                <field.TextField
                  label={t("fields.firstname")}
                  autoComplete="given-name"
                />
              )}
            </form.AppField>
            <form.AppField name="lastname">
              {(field) => (
                <field.TextField
                  label={t("fields.lastname")}
                  autoComplete="family-name"
                />
              )}
            </form.AppField>
          </div>
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
                autoComplete="new-password"
              />
            )}
          </form.AppField>
          <form.SubmitButton
            label={t("signUp.submit")}
            pending={navigating}
            className="w-full"
          />
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
