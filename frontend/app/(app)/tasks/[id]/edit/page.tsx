import type { Metadata } from "next";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskForm } from "../../task-form";
import { loadTask } from "../load-task";

export const metadata: Metadata = { title: "Edit task" };

export default function EditTaskPage({
  params,
}: PageProps<"/tasks/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditTask params={params} />
    </Suspense>
  );
}

async function EditTask({
  params,
}: Pick<PageProps<"/tasks/[id]/edit">, "params">) {
  const task = await loadTask((await params).id);

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/tasks/${encodeURIComponent(task.id)}`}
        label={task.name}
      />
      <PageContentHeader>
        <PageContentTitle>Edit {task.name}</PageContentTitle>
        <PageContentDescription>
          Activity <span className="font-semibold">{task.activity?.name}</span>.
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <TaskForm task={task} />
      </PageContentBody>
    </PageContent>
  );
}
