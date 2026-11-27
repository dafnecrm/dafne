"use client";

import { useTranslations } from "next-intl";
import { revalidateLogic } from "@tanstack/react-form-nextjs";
import { CircleCheckIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertTitle } from "@dafne/frontend-ui/components/alert";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import {
  setServerError,
  useAppForm,
  useResetOnLeave,
} from "@dafne/frontend-forms/client";
import { authClient, useAuthServerError } from "@dafne/frontend-auth/client";
import { changePasswordFormOpts, changePasswordSchema } from "./schema";

/** Changes the signed-in user's password, given the current one. */
export function ChangePasswordForm() {
  const t = useTranslations("account.password");
  const authServerError = useAuthServerError();
  const [changed, setChanged] = useState(false);

  const form = useAppForm({
    ...changePasswordFormOpts,
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: changePasswordSchema },
    onSubmit: async ({ value, formApi }) => {
      setChanged(false);
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: value.revokeOtherSessions,
      });
      if (error) {
        setServerError(formApi, authServerError(error));
        return;
      }
      formApi.reset();
      setChanged(true);
    },
  });

  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);

  return (
    <form
      noValidate
      className="max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.AppForm>
        <FieldGroup>
          {changed && (
            <Alert>
              <CircleCheckIcon />
              <AlertTitle>{t("changed")}</AlertTitle>
            </Alert>
          )}
          <form.FormErrors rejectedTitle={t("failed")} />
          <form.AppField name="currentPassword">
            {(field) => (
              <field.PasswordField
                label={t("fields.current")}
                autoComplete="current-password"
              />
            )}
          </form.AppField>
          <form.AppField name="newPassword">
            {(field) => (
              <field.PasswordField
                label={t("fields.new")}
                autoComplete="new-password"
              />
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {(field) => (
              <field.PasswordField
                label={t("fields.confirm")}
                autoComplete="new-password"
              />
            )}
          </form.AppField>
          <form.AppField name="revokeOtherSessions">
            {(field) => (
              <field.CheckboxField label={t("fields.revokeOtherSessions")} />
            )}
          </form.AppField>
          <form.SubmitButton label={t("submit")} />
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
