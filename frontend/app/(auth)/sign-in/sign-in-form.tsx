"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormAlert, SubmitButton } from "../form-parts";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, {});

  return (
    <form action={action}>
      <FieldGroup>
        <FormAlert message={state.error} />
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            defaultValue={state.values?.email}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="rememberMe" name="rememberMe" defaultChecked />
          <FieldLabel htmlFor="rememberMe" className="font-normal">
            Remember me
          </FieldLabel>
        </Field>
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </FieldGroup>
    </form>
  );
}
