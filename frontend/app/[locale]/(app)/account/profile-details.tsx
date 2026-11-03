"use client";

import { CalendarPlusIcon, MailIcon, ShieldIcon, UserIcon } from "lucide-react";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/session";
import { AvatarUpload } from "./avatar-upload";

/**
 * Read-only view of the signed-in user's details. "Member since" is shown in
 * the viewer's time zone, which is only known in the browser.
 */
export function ProfileDetails({ user }: { user: User }) {
  const role = user.role ?? "user";

  return (<>
    <DetailSection title="Profile" groupClassName="flex flex-row gap-12!">
      <AvatarUpload
        image={user.image ?? null}
        initials={`${user.firstname[0] ?? ""}${user.lastname[0] ?? ""}`.toUpperCase()}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-10">
        <Detail icon={UserIcon} label="First name">
          {user.firstname}
        </Detail>
        <Detail icon={UserIcon} label="Last name">
          {user.lastname}
        </Detail>
        <Detail icon={MailIcon} label="Email">
          <div className="min-w-0 truncate" title={user.email}>
            {user.email}
          </div>
          {user.emailVerified ? (
            <Badge variant="outline" className="shrink-0">
              Verified
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              Not verified
            </Badge>
          )}
        </Detail>
        <Detail icon={ShieldIcon} label="Role">
          <Badge variant={role === "admin" ? "default" : "secondary"}>
            {role}
          </Badge>
        </Detail>
        <Detail icon={CalendarPlusIcon} label="Member since">
          <LocalDate value={user.createdAt} format="longDate" />
        </Detail>
      </div>


    </DetailSection>
  </>
  );
}
