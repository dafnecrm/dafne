"use client";

import { useTranslations } from "next-intl";
import { CalendarPlusIcon, MailIcon, ShieldIcon, UserIcon } from "lucide-react";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { Badge } from "@dafne/frontend-ui/components/badge";
import type { User } from "@/lib/session";
import { AvatarUpload } from "./avatar-upload";

/**
 * Read-only view of the signed-in user's details. "Member since" is shown in
 * the viewer's time zone, which is only known in the browser.
 */
export function ProfileDetails({ user }: { user: User }) {
  const role = user.role ?? "user";
  const t = useTranslations();

  return (
    <>
      <DetailSection
        title={t("users.sections.profile")}
        groupClassName="flex flex-row gap-12!"
      >
        <AvatarUpload
          image={user.image ?? null}
          initials={`${user.firstname[0] ?? ""}${user.lastname[0] ?? ""}`.toUpperCase()}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-10">
          <Detail icon={UserIcon} label={t("users.fields.firstname")}>
            {user.firstname}
          </Detail>
          <Detail icon={UserIcon} label={t("users.fields.lastname")}>
            {user.lastname}
          </Detail>
          <Detail icon={MailIcon} label={t("users.fields.email")}>
            <div className="min-w-0 truncate" title={user.email}>
              {user.email}
            </div>
            {user.emailVerified ? (
              <Badge variant="outline" className="shrink-0">
                {t("users.verified")}
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0">
                {t("users.notVerified")}
              </Badge>
            )}
          </Detail>
          <Detail icon={ShieldIcon} label={t("users.fields.role")}>
            <Badge variant={role === "admin" ? "default" : "secondary"}>
              {t.has(`users.role.${role}` as never)
                ? t(`users.role.${role}` as "users.role.user")
                : role}
            </Badge>
          </Detail>
          <Detail icon={CalendarPlusIcon} label={t("account.memberSince")}>
            <LocalDate value={user.createdAt} format="longDate" />
          </Detail>
        </div>
      </DetailSection>
    </>
  );
}
