import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { activityHref } from "@/lib/tasks-table";
import { TaskDetailActions } from "../task-detail-actions";
import { TaskDetails } from "../task-detail";
import { loadTask } from "./load-task";

export const metadata: Metadata = { title: "Task" };

export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <TaskProfile params={params} />
    </Suspense>
  );
}

/** Loads the task: its name and actions, then its details. */
async function TaskProfile({
  params,
}: Pick<PageProps<"/tasks/[id]">, "params">) {
  const task = await loadTask((await params).id);

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/tasks/${encodeURIComponent(task.id)}`}
        label={task.name}
      />
      <PageContentHeader>
        <PageContentTitle>{task.name}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={activityHref(task.activityId)} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Activity
          </Button>
          <TaskDetailActions task={task} />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <TaskDetails task={task} />
      </PageContentBody>
    </PageContent>
  );
}
