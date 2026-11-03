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
} from "@/components/page-content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTableParams } from "@/lib/data-table";
import { listActivities } from "@/lib/activities";
import { activitiesTable } from "@/lib/activities-table";
import { requireUser } from "@/lib/session";
import { ActivitiesTable } from "./activities-table";

export const metadata: Metadata = { title: "Activities" };

export default function ActivitiesPage({
  searchParams,
}: PageProps<"/activities">) {
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>Activities</PageContentTitle>
        <PageContentDescription>
          Filter by a field, or click a column to sort.
        </PageContentDescription>
        <PageContentAction>
          <Button nativeButton={false} render={<Link href="/activities/new" />}>
            <PlusIcon data-icon="inline-start" />
            New activity
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
}: Pick<PageProps<"/activities">, "searchParams">) {
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
      activities={data.activities}
      total={data.total}
      params={params}
    />
  );
}
