import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityDetails } from "../activity-detail";
import { ActivityDetailActions } from "../activity-detail-actions";
import { ActivityTasks } from "../activity-tasks";
import { loadActivity } from "./load-activity";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage({
  params,
}: PageProps<"/activities/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ActivityProfile params={params} />
    </Suspense>
  );
}

/** Loads the activity: its name and actions, then its details. */
async function ActivityProfile({
  params,
}: Pick<PageProps<"/activities/[id]">, "params">) {
  const activity = await loadActivity((await params).id);

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/activities/${encodeURIComponent(activity.id)}`}
        label={activity.name}
      />
      <PageContentHeader>
        <PageContentTitle>{activity.name}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/activities" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            All activities
          </Button>
          <ActivityDetailActions activity={activity} />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <ActivityDetails activity={activity} />
        <ActivityTasks activity={activity} />
      </PageContentBody>
    </PageContent>
  );
}
