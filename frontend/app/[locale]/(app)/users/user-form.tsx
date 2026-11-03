"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { useResetOnLeave } from "@/lib/app-form/reset-on-leave";
import { createUser } from "./actions";
import { ROLE_OPTIONS, userFormOpts, userSchema } from "./schema";

/** Creates a user (admins only). Saving opens the new user's page. */
export function UserForm() {
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
                <h2>Details</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <form.AppField name="firstname">
                  {(field) => (
                    <field.TextField
                      label="First name"
                      autoComplete="off"
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="lastname">
                  {(field) => (
                    <field.TextField label="Last name" autoComplete="off" />
                  )}
                </form.AppField>
                <form.AppField name="email">
                  {(field) => (
                    <field.TextField
                      label="Email"
                      type="email"
                      autoComplete="off"
                      placeholder="name@example.com"
                    />
                  )}
                </form.AppField>
                <form.AppField name="role">
                  {(field) => (
                    <field.SelectField label="Role" options={ROLE_OPTIONS} />
                  )}
                </form.AppField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Password</h2>
              </CardTitle>
              <CardDescription>
                The user signs in with this password once they verify their
                email: share it with them securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form.AppField name="password">
                {(field) => (
                  <field.PasswordField
                    label="Password"
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
              render={<Link href="/users" />}
            >
              Cancel
            </Button>
            <form.SubmitButton label="Create user" />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
