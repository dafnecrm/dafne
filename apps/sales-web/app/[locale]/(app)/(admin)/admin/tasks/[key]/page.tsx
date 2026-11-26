import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { TASK_RUN_STATUSES, type TaskRunStatus } from "@dafne/contracts";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentBack,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { TASKS_PATH, taskHref, taskKeyOf } from "@dafne/frontend-tasks";
import { RunTaskButton } from "@dafne/frontend-tasks/components/run-task-button";
import { TaskRuns } from "@dafne/frontend-tasks/components/task-runs";
import { TaskSettingsForm } from "@dafne/frontend-tasks/components/task-settings-form";
import { listTaskRuns } from "@dafne/frontend-tasks/server";
import { loadTask } from "./load-task";

const PAGE_SIZE = 20;

/** The task's name, or its key when the app has no text for it. */
async function taskName(key: string) {
  const t = await getTranslations();
  const name = `tasks.names.${key}.name`;
  return t.has(name as never) ? t(name as never) : key;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/tasks/[key]">): Promise<Metadata> {
  return { title: await taskName(taskKeyOf((await params).key)) };
}

export default function TaskPage({ params, searchParams }: PageProps<"/[locale]/admin/tasks/[key]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Task params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** The task's settings, then its runs (`?status=`, `?offset=`). */
async function Task({ params, searchParams }: PageProps<"/[locale]/admin/tasks/[key]">) {
  const key = taskKeyOf((await params).key);
  const query = await searchParams;
  const status = TASK_RUN_STATUSES.find((value) => value === query.status) as TaskRunStatus | undefined;
  const offset = Math.max(0, Number.parseInt(String(query.offset ?? "0"), 10) || 0);
  const [task, runs] = await Promise.all([loadTask(key), listTaskRuns(key, { limit: PAGE_SIZE, offset, status })]);
  const t = await getTranslations();
  const name = await taskName(key);
  const description = `tasks.names.${key}.description`;
  const path = taskHref(key);

  return (
    <PageContent>
      <BreadcrumbLabel href={path} label={name} />
      <PageContentHeader>
        <PageContentTitle
          back={
            <PageContentBack
              label={t("tasks.all")}
              render={<Link href={TASKS_PATH} />}
            />
          }
        >
          {name}
        </PageContentTitle>
        <PageContentDescription>
          {t.has(description as never) ? t(description as never) : <code>{key}</code>}
        </PageContentDescription>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <RunTaskButton taskKey={key} path={path} />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <DetailSection title={t("tasks.settings")}>
          {/* Keyed by the last change: a reset starts the form over. */}
          <TaskSettingsForm key={task.updatedAt} task={task} />
        </DetailSection>
        <DetailSection title={t("tasks.runs.title")}>
          <TaskRuns runs={runs} path={path} status={status} />
        </DetailSection>
      </PageContentBody>
    </PageContent>
  );
}
