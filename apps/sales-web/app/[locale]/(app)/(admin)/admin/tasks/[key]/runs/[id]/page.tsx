import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { taskHref, taskKeyOf } from "@dafne/frontend-tasks";
import { TaskRunDetails } from "@dafne/frontend-tasks/components/task-run-details";
import { loadTaskRun } from "../../load-task";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/tasks/[key]/runs/[id]">): Promise<Metadata> {
  const t = await getTranslations("tasks.runs");
  return { title: t("run", { id: (await params).id }) };
}

export default function TaskRunPage({ params }: PageProps<"/[locale]/admin/tasks/[key]/runs/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <TaskRun params={params} />
    </Suspense>
  );
}

/** A run of the task: its status, timings, error, log, input and result. */
async function TaskRun({ params }: Pick<PageProps<"/[locale]/admin/tasks/[key]/runs/[id]">, "params">) {
  const { key: slug, id } = await params;
  const key = taskKeyOf(slug);
  const run = await loadTaskRun(key, id);
  const t = await getTranslations();
  const taskPath = taskHref(key);
  const name = t.has(`tasks.names.${key}.name` as never) ? t(`tasks.names.${key}.name` as never) : key;
  const title = t("tasks.runs.run", { id: run.id });

  return (
    <PageContent>
      <BreadcrumbLabel href={taskPath} label={name} />
      <BreadcrumbLabel href={`${taskPath}/runs/${run.id}`} label={title} />
      <PageContentHeader>
        <PageContentTitle>{`${name} · ${title}`}</PageContentTitle>
        <PageContentAction>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={taskPath} />}>
            <ArrowLeftIcon data-icon="inline-start" />
            {name}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <TaskRunDetails run={run} />
      </PageContentBody>
    </PageContent>
  );
}
