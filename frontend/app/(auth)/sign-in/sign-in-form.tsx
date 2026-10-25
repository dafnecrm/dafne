"use client";

import {
  initialFormState,
  mergeForm,
  revalidateLogic,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { startTransition, useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { FieldGroup } from "@/components/ui/field";
import { definedState, useAppForm } from "@/lib/app-form/app-form";
import { signInFormOpts, signInSchema } from "../schemas";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initialFormState);

  const form = useAppForm({
    ...signInFormOpts,
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signInSchema },
    // Shows the values and errors returned by the server action.
    transform: useTransform((base) => mergeForm(base, definedState(state)), [state]),
    onSubmitMeta: {} as { formData?: FormData },
    onSubmit: ({ meta }) => {
      if (meta.formData) startTransition(() => action(meta.formData!));
    },
  });

  return (
    <form
      action={action}
      noValidate
      onSubmit={(e) => {
        // Without JavaScript the form posts straight to the action.
        e.preventDefault();
        form.handleSubmit({ formData: new FormData(e.currentTarget) });
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
            {(field) => <field.PasswordField label="Password" autoComplete="current-password" />}
          </form.AppField>
          <form.AppField name="rememberMe">
            {(field) => <field.CheckboxField label="Remember me" />}
          </form.AppField>
          <form.SubmitButton label="Sign in" pending={pending} className="w-full" />
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
