import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Button } from "@dafne/frontend-ui/components/button";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { getTableParams } from "@dafne/frontend-data-table";
import { AssistantModelsTable } from "@dafne/frontend-assistant/assistant-models/components/assistant-models-table";
import { listAssistantModels } from "@dafne/frontend-assistant/assistant-models/server";
import { assistantModelsTable } from "@/lib/assistant-models-table";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantModels.title") };
}

export default function AssistantModelsPage({
  searchParams,
}: PageProps<"/[locale]/admin/assistant-models">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("assistantModels.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button
            nativeButton={false}
            render={<Link href={`${assistantModelsTable.path}/new`} />}
          >
            <PlusIcon data-icon="inline-start" />
            {t("assistantModels.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <AssistantModelsList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function AssistantModelsList({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/assistant-models">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, assistantModelsTable);
  const data = await listAssistantModels({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <AssistantModelsTable
      config={assistantModelsTable}
      assistantModels={data.items}
      total={data.total}
      params={params}
    />
  );
}
