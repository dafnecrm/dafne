import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentBack,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { loadActivity } from "./load-activity";
import { ActivityDetailActions } from "@dafne/frontend-activities/components/activity-detail-actions";
import { ActivityDetails } from "@dafne/frontend-activities/components/activity-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activities");
  return { title: t("singular") };
}

export default function ActivityPage({
  params,
}: PageProps<"/[locale]/activities/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ActivityProfile params={params} />
    </Suspense>
  );
}

/** Loads the activity: its name and actions, then its details. */
async function ActivityProfile({
  params,
}: Pick<PageProps<"/[locale]/activities/[id]">, "params">) {
  const activity = await loadActivity((await params).id);
  const t = await getTranslations("activities");

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/activities/${encodeURIComponent(activity.id)}`}
        label={activity.name}
      />
      <PageContentHeader>
        <PageContentTitle
          back={
            <PageContentBack
              label={t("all")}
              render={<Link href="/activities" />}
            />
          }
        >
          {activity.name}
        </PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <ActivityDetailActions activity={activity} />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <ActivityDetails activity={activity} />
      </PageContentBody>
    </PageContent>
  );
}
