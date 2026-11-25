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
import { AssistantAgentsTable } from "@dafne/frontend-assistant/assistant-agents/components/assistant-agents-table";
import { listAssistantAgents } from "@dafne/frontend-assistant/assistant-agents/server";
import { assistantAgentsTable } from "@/lib/assistant-agents-table";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantAgents.title") };
}

export default function AssistantAgentsPage({
  searchParams,
}: PageProps<"/[locale]/admin/assistant-agents">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("assistantAgents.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`${assistantAgentsTable.path}/new`} />}
          >
            <PlusIcon data-icon="inline-start" />
            {t("assistantAgents.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <AssistantAgentsList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function AssistantAgentsList({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/assistant-agents">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, assistantAgentsTable);
  const data = await listAssistantAgents({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <AssistantAgentsTable
      config={assistantAgentsTable}
      assistantAgents={data.items}
      total={data.total}
      params={params}
    />
  );
}
