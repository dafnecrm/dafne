import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { loadActivity } from "../load-activity";
import { ActivityForm } from "@dafne/frontend-activities/components/activity-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activities");
  return { title: t("editMeta") };
}

export default function EditActivityPage({
  params,
}: PageProps<"/[locale]/activities/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditActivity params={params} />
    </Suspense>
  );
}

async function EditActivity({
  params,
}: Pick<PageProps<"/[locale]/activities/[id]/edit">, "params">) {
  const activity = await loadActivity((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/activities/${encodeURIComponent(activity.id)}`}
        label={activity.name}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", { name: activity.name })}
        </PageContentTitle>
        <PageContentDescription>
          {t("activities.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <ActivityForm activity={activity} />
      </PageContentBody>
    </PageContent>
  );
}
