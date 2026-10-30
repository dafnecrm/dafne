import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { loadActivity } from "../../activities/[id]/load-activity";
import { TaskForm } from "../task-form";

export const metadata: Metadata = { title: "New task" };

/**
 * A new task of an activity: /tasks/new?activityId=… (the "Add task"
 * button of the activity's page). Without a valid activity it's a 404.
 */
export default function NewTaskPage({ searchParams }: PageProps<"/tasks/new">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <NewTask searchParams={searchParams} />
    </Suspense>
  );
}

async function NewTask({
  searchParams,
}: Pick<PageProps<"/tasks/new">, "searchParams">) {
  const { activityId } = await searchParams;
  if (typeof activityId !== "string" || !activityId) notFound();
  const activity = await loadActivity(activityId);

  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>New task</PageContentTitle>
        <PageContentDescription>For {activity.name}.</PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <TaskForm activityId={activity.id} />
      </PageContentBody>
    </PageContent>
  );
}
