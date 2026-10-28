import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityForm } from "../../activity-form";
import { loadActivity } from "../load-activity";

export const metadata: Metadata = { title: "Edit activity" };

export default function EditActivityPage({
  params,
}: PageProps<"/activities/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditActivity params={params} />
    </Suspense>
  );
}

async function EditActivity({
  params,
}: Pick<PageProps<"/activities/[id]/edit">, "params">) {
  const activity = await loadActivity((await params).id);

  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>Edit {activity.name}</PageContentTitle>
        <PageContentDescription>
          Saving replaces the activity&apos;s details.
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <ActivityForm activity={activity} />
      </PageContentBody>
    </PageContent>
  );
}
