"use client";

import { FieldGroup } from "@/components/ui/field";
import { useAppForm } from "@/lib/app-form/app-form";

interface ProfileDetailsProps {
  firstname: string;
  lastname: string;
  email: string;
  memberSince: string;
}

/** Read-only view of the user's details. */
export function ProfileDetails(values: ProfileDetailsProps) {
  const form = useAppForm({ defaultValues: values });

  return (
    <form.AppForm>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <form.AppField name="firstname">
            {(field) => <field.UncontrolledField label="First name" />}
          </form.AppField>
          <form.AppField name="lastname">
            {(field) => <field.UncontrolledField label="Last name" />}
          </form.AppField>
        </div>
        <form.AppField name="email">
          {(field) => <field.UncontrolledField label="Email" type="email" />}
        </form.AppField>
        <form.AppField name="memberSince">
          {(field) => <field.UncontrolledField label="Member since" />}
        </form.AppField>
      </FieldGroup>
    </form.AppForm>
  );
}
