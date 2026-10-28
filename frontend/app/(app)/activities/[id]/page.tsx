import {
  ArrowLeftIcon,
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  PencilIcon,
  UserPenIcon,
  UserPlusIcon,
  TagIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityDetail } from "@/lib/activities";
import { DeleteActivityButton } from "../delete-activity-button";
import { loadActivity } from "./load-activity";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/activities-table";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage({
  params,
}: PageProps<"/activities/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ActivityDetails params={params} />
    </Suspense>
  );
}

async function ActivityDetails({
  params,
}: Pick<PageProps<"/activities/[id]">, "params">) {
  return <ActivityProfile activity={await loadActivity((await params).id)} />;
}

function ActivityProfile({ activity }: { activity: ActivityDetail }) {
  const editHref = `/activities/${encodeURIComponent(activity.id)}/edit`;
  return (
    <PageContent>
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
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={editHref} />}
          >
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
          <DeleteActivityButton activity={activity} then="list" />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <DetailSection title="Details">
          <Detail icon={TagIcon} label="Type">
            {ACTIVITY_TYPE_OPTIONS.find((o) => o.value === activity.type)
              ?.label ?? "—"}
          </Detail>
        </DetailSection>
        <DetailSection title="Record">
          <Detail icon={FingerprintIcon} label="Activity ID">
            <div className="flex items-center gap-2">
              <code className="truncate font-mono text-xs">{activity.id}</code>
              <CopyButton variant="ghost" value={activity.id} />
            </div>
          </Detail>
          <Detail icon={CalendarPlusIcon} label="Created">
            <LocalDate value={activity.createdAt} format="dateTime" />
          </Detail>
          <Detail icon={UserPlusIcon} label="Created by">
            {activity.createdBy?.name ?? "—"}
          </Detail>
          <Detail icon={HistoryIcon} label="Updated">
            <LocalDate value={activity.updatedAt} format="dateTime" />
          </Detail>
          <Detail icon={UserPenIcon} label="Updated by">
            {activity.updatedBy?.name ?? "—"}
          </Detail>
        </DetailSection>
      </PageContentBody>
    </PageContent>
  );
}
