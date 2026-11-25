import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { TASKS_PATH } from "@dafne/frontend-tasks";
import { TasksList } from "@dafne/frontend-tasks/components/tasks-list";
import { listTasks } from "@dafne/frontend-tasks/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks");
  return { title: t("title") };
}

export default function TasksPage() {
  const t = useTranslations("tasks");
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("title")}</PageContentTitle>
        <PageContentDescription>{t("description")}</PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <Tasks />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

async function Tasks() {
  return <TasksList tasks={await listTasks()} path={TASKS_PATH} />;
}
