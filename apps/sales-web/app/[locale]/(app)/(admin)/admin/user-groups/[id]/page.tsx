import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Button } from "@dafne/frontend-ui/components/button";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { UserGroupDetails } from "@dafne/frontend-user-groups/components/user-group-detail";
import { UserGroupDetailActions } from "@dafne/frontend-user-groups/components/user-group-detail-actions";
import { userGroupsTable } from "@/lib/user-groups-table";
import { loadUserGroup } from "./load-user-group";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("userGroups.singular") };
}

export default function UserGroupPage({
  params,
}: PageProps<"/[locale]/admin/user-groups/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <UserGroupProfile params={params} />
    </Suspense>
  );
}

/** Loads the user group: its id and actions, then its details. */
async function UserGroupProfile({
  params,
}: Pick<PageProps<"/[locale]/admin/user-groups/[id]">, "params">) {
  const userGroup = await loadUserGroup((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${userGroupsTable.path}/${encodeURIComponent(userGroup.id)}`}
        label={`${t("userGroups.singular")} ${userGroup.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>{`${t("userGroups.singular")} ${userGroup.id}`}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={userGroupsTable.path} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("userGroups.all")}
          </Button>
          <UserGroupDetailActions
            userGroup={userGroup}
            path={userGroupsTable.path}
          />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <UserGroupDetails userGroup={userGroup} />
      </PageContentBody>
    </PageContent>
  );
}
