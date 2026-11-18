import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Button } from "@dafne/frontend-ui/components/button";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { getTableParams } from "@dafne/frontend-data-table";
import { UserGroupsTable } from "@dafne/frontend-user-groups/components/user-groups-table";
import { listUserGroups } from "@dafne/frontend-user-groups/server";
import { userGroupsTable } from "@/lib/user-groups-table";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("userGroups.title") };
}

export default function UserGroupsPage({
  searchParams,
}: PageProps<"/[locale]/admin/user-groups">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("userGroups.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button
            nativeButton={false}
            render={<Link href={`${userGroupsTable.path}/new`} />}
          >
            <PlusIcon data-icon="inline-start" />
            {t("userGroups.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <UserGroupsList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function UserGroupsList({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/user-groups">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, userGroupsTable);
  const data = await listUserGroups({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <UserGroupsTable
      config={userGroupsTable}
      userGroups={data.items}
      total={data.total}
      params={params}
    />
  );
}
