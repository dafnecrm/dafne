"use client";

import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormAlert, SubmitButton } from "../form-parts";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, {});

  return (
    <form action={action}>
      <FieldGroup>
        <FormAlert message={state.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="firstname">First name</FieldLabel>
            <Input
              id="firstname"
              name="firstname"
              autoComplete="given-name"
              required
              maxLength={255}
              defaultValue={state.values?.firstname}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="lastname">Last name</FieldLabel>
            <Input
              id="lastname"
              name="lastname"
              autoComplete="family-name"
              required
              maxLength={255}
              defaultValue={state.values?.lastname}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={255}
            defaultValue={state.values?.email}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          {/* Same limits as the backend's SignUpDto. */}
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
        </Field>
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </FieldGroup>
    </form>
  );
}
