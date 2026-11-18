import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
  HashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { Badge } from "@dafne/frontend-ui/components/badge";
import type { UserGroupDetail } from "../types.ts";

/** The details of an user group: its fields, then who created and updated it. */
export function UserGroupDetails({
  userGroup,
}: {
  userGroup: UserGroupDetail;
}) {
  const t = useTranslations();
  return (
    <>
      <DetailSection
        title={t("userGroups.sections.details")}
        groupVariant="grid"
      >
        <Detail icon={TextIcon} label={t("userGroups.fields.name")}>
          {userGroup.name}
        </Detail>
        <Detail icon={TextIcon} label={t("userGroups.fields.description")}>
          {userGroup.description ?? "—"}
        </Detail>
        <Detail icon={HashIcon} label={t("userGroups.fields.memberCount")}>
          {userGroup.memberCount}
        </Detail>
      </DetailSection>
      <DetailSection title={t("userGroups.sections.permissions")}>
        {userGroup.permissions.length === 0 ? (
          <p className="text-muted-foreground">—</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {userGroup.permissions.map((permission) => {
              const [subject, action] = permission.split(".");
              return (
                <Badge key={permission} variant="secondary">
                  {t(`userGroups.permissions.subjects.${subject}` as "userGroups.permissions.subjects.Customer")}
                  {": "}
                  {t(`userGroups.permissions.actions.${action}` as "userGroups.permissions.actions.create")}
                </Badge>
              );
            })}
          </div>
        )}
      </DetailSection>
      <DetailSection title={t("userGroups.sections.members")}>
        {userGroup.allUsers ? (
          <p className="text-muted-foreground">{t("userGroups.allUsers.hint")}</p>
        ) : userGroup.members.length === 0 ? (
          <p className="text-muted-foreground">{t("userGroups.members.none")}</p>
        ) : (
          <ul className="grid gap-1">
            {userGroup.members.map((member) => (
              <li key={member.id} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{member.name}</span>
                <a href={`mailto:${member.email}`} className="text-muted-foreground underline-offset-4 hover:underline">
                  {member.email}
                </a>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("userGroups.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">{userGroup.id}</code>
            <CopyButton
              variant="ghost"
              size="xs"
              value={String(userGroup.id)}
            />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={userGroup.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {userGroup.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={userGroup.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {userGroup.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
