import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { UserGroupForm } from "@dafne/frontend-user-groups/components/user-group-form";
import { userGroupsTable } from "@/lib/user-groups-table";
import { loadUserGroup } from "../load-user-group";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("userGroups.editMeta") };
}

export default function EditUserGroupPage({
  params,
}: PageProps<"/[locale]/admin/user-groups/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditUserGroup params={params} />
    </Suspense>
  );
}

async function EditUserGroup({
  params,
}: Pick<PageProps<"/[locale]/admin/user-groups/[id]/edit">, "params">) {
  const userGroup = await loadUserGroup((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${userGroupsTable.path}/${encodeURIComponent(userGroup.id)}`}
        label={`${t("userGroups.singular")} ${userGroup.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("userGroups.singular")} ${userGroup.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("userGroups.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <UserGroupForm userGroup={userGroup} path={userGroupsTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
