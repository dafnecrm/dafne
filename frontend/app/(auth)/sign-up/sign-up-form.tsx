"use client";

import {
  initialFormState,
  mergeForm,
  revalidateLogic,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { startTransition, useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { FieldGroup } from "@/components/ui/field";
import { definedState, useAppForm } from "@/lib/app-form/app-form";
import { signUpFormOpts, signUpSchema } from "../schemas";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialFormState);

  const form = useAppForm({
    ...signUpFormOpts,
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signUpSchema },
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
          <div className="grid grid-cols-2 gap-3">
            <form.AppField name="firstname">
              {(field) => <field.TextField label="First name" autoComplete="given-name" />}
            </form.AppField>
            <form.AppField name="lastname">
              {(field) => <field.TextField label="Last name" autoComplete="family-name" />}
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
            {(field) => <field.PasswordField label="Password" autoComplete="new-password" />}
          </form.AppField>
          <form.SubmitButton label="Create account" pending={pending} className="w-full" />
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
