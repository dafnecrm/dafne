"use client";

import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";
import { useTranslations } from "next-intl";
import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dafne/frontend-ui/components/card";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { createUser } from "./actions";
import { ROLE_OPTIONS, userFormOpts, userSchema } from "./schema";

/** Creates a user (admins only). Saving opens the new user's page. */
export function UserForm() {
  const t = useTranslations();
  const roleOptions = useOptionLabels(ROLE_OPTIONS);
  const form = useAppForm({
    ...userFormOpts,
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: userSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await createUser(value);
      if (result?.error) setServerError(formApi, result.error);
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

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("users.sections.details")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <form.AppField name="firstname">
                  {(field) => (
                    <field.TextField
                      label={t("users.fields.firstname")}
                      autoComplete="off"
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="lastname">
                  {(field) => (
                    <field.TextField
                      label={t("users.fields.lastname")}
                      autoComplete="off"
                    />
                  )}
                </form.AppField>
                <form.AppField name="email">
                  {(field) => (
                    <field.TextField
                      label={t("users.fields.email")}
                      type="email"
                      autoComplete="off"
                      placeholder={t("common.emailPlaceholder")}
                    />
                  )}
                </form.AppField>
                <form.AppField name="role">
                  {(field) => (
                    <field.SelectField
                      label={t("users.fields.role")}
                      options={roleOptions}
                    />
                  )}
                </form.AppField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("users.sections.password")}</h2>
              </CardTitle>
              <CardDescription>{t("users.passwordHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form.AppField name="password">
                {(field) => (
                  <field.PasswordField
                    label={t("users.fields.password")}
                    autoComplete="new-password"
                    className="md:max-w-sm"
                  />
                )}
              </form.AppField>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/admin/users" />}
            >
              {t("common.cancel")}
            </Button>
            <form.SubmitButton label={t("users.create")} />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
