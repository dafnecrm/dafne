"use client";

import { Detail, DetailSection } from "@/components/detail";
import { PageContent, PageContentDescription, PageContentHeader, PageContentTitle } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/session";
import { MailIcon, ShieldIcon, UserIcon } from "lucide-react";

interface ProfileDetailsProps {
  user: User
}

/**
 * Read-only view of the user's details. "Member since" is shown in the
 * viewer's time zone, which is only known in the browser.
 */
export function ProfileDetails({ user }: ProfileDetailsProps) {
  return (
    <ProfileForm key={user.email} user={user} />
  );
}

function ProfileForm({ user }: { user: User }) {
  const role = user.role ?? "user";

  return (
    <DetailSection
      title="Profile"
      groupClassName="grid sm:grid-cols-2"
    >
      <Detail icon={UserIcon} label="First name">
        {user.firstname}
      </Detail>
      <Detail icon={UserIcon} label="Last name">
        {user.lastname}
      </Detail>
      <Detail icon={MailIcon} label="Email">
        <span className="flex flex-wrap items-center gap-2">
          {user.email}
          {user.emailVerified ? (
            <Badge variant="outline">Verified</Badge>
          ) : (
            <Badge variant="secondary">Not verified</Badge>
          )}
        </span>
      </Detail>
      <Detail icon={ShieldIcon} label="Role">
        <Badge variant={role === "admin" ? "default" : "secondary"}>
          {role}
        </Badge>
      </Detail>
    </DetailSection>
    // <form.AppForm>
    //   <FieldGroup>
    //     <div className="grid gap-5 sm:grid-cols-2">
    //       <form.AppField name="firstname">
    //         {(field) => <field.UncontrolledField label="First name" />}
    //       </form.AppField>
    //       <form.AppField name="lastname">
    //         {(field) => <field.UncontrolledField label="Last name" />}
    //       </form.AppField>
    //     </div>
    //     <form.AppField name="email">
    //       {(field) => <field.UncontrolledField label="Email" type="email" />}
    //     </form.AppField>
    //     <form.AppField name="memberSince">
    //       {(field) => <field.UncontrolledField label="Member since" />}
    //     </form.AppField>
    //   </FieldGroup>
    // </form.AppForm>
  );
}
