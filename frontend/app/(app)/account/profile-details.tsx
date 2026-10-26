"use client";

import { useTimeZone } from "@/components/local-date";
import { FieldGroup } from "@/components/ui/field";
import { useAppForm } from "@/lib/app-form/app-form";
import { formatDate } from "@/lib/dates";

interface ProfileDetailsProps {
  firstname: string;
  lastname: string;
  email: string;
  /** Sign-up date (a Date or a JSON date string). */
  createdAt: string | Date;
}

/**
 * Read-only view of the user's details. "Member since" is shown in the
 * viewer's time zone, which is only known in the browser.
 */
export function ProfileDetails({ createdAt, ...values }: ProfileDetailsProps) {
  const timeZone = useTimeZone();
  const memberSince = timeZone
    ? formatDate(createdAt, "longDate", timeZone)
    : "";
  // The fields are uncontrolled: remount once the time zone is known.
  return (
    <ProfileForm key={timeZone ?? ""} {...values} memberSince={memberSince} />
  );
}

function ProfileForm(
  values: Omit<ProfileDetailsProps, "createdAt"> & { memberSince: string },
) {
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
