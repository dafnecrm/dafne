import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { requireUser } from "@/lib/session";
import { ActivitiesTable } from "@dafne/frontend-activities/components/activities-table";
import { activitiesTable } from "@/lib/activities-table";
import { listActivities } from "@dafne/frontend-activities/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activities");
  return { title: t("title") };
}

export default function ActivitiesPage({
  searchParams,
}: PageProps<"/[locale]/activities">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("activities.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button nativeButton={false} render={<Link href="/activities/new" />}>
            <PlusIcon data-icon="inline-start" />
            {t("activities.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <ActivitiesList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function ActivitiesList({
  searchParams,
}: Pick<PageProps<"/[locale]/activities">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, activitiesTable);
  const data = await listActivities({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <ActivitiesTable
      config={activitiesTable}
      activities={data.items}
      total={data.total}
      params={params}
    />
  );
}
