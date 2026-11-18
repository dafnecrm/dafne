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
import { AssistantProvidersTable } from "@dafne/frontend-assistant/assistant-providers/components/assistant-providers-table";
import { listAssistantProviders } from "@dafne/frontend-assistant/assistant-providers/server";
import { assistantProvidersTable } from "@/lib/assistant-providers-table";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantProviders.title") };
}

export default function AssistantProvidersPage({
  searchParams,
}: PageProps<"/[locale]/admin/assistant-providers">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("assistantProviders.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button
            nativeButton={false}
            render={<Link href={`${assistantProvidersTable.path}/new`} />}
          >
            <PlusIcon data-icon="inline-start" />
            {t("assistantProviders.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <AssistantProvidersList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function AssistantProvidersList({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/assistant-providers">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, assistantProvidersTable);
  const data = await listAssistantProviders({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <AssistantProvidersTable
      config={assistantProvidersTable}
      assistantProviders={data.items}
      total={data.total}
      params={params}
    />
  );
}
