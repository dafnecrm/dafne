import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { UserGroupForm } from "@dafne/frontend-user-groups/components/user-group-form";
import { userGroupsTable } from "@/lib/user-groups-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("userGroups.new") };
}

export default function NewUserGroupPage() {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("userGroups.new")}</PageContentTitle>
        <PageContentDescription>
          {t("userGroups.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <UserGroupForm path={userGroupsTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
