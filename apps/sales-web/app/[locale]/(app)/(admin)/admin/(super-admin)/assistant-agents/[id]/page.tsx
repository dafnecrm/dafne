import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentBack,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { AssistantAgentDetails } from "@dafne/frontend-assistant/assistant-agents/components/assistant-agent-detail";
import { AssistantAgentDetailActions } from "@dafne/frontend-assistant/assistant-agents/components/assistant-agent-detail-actions";
import { assistantAgentsTable } from "@/lib/assistant-agents-table";
import { loadAssistantAgent } from "./load-assistant-agent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantAgents.singular") };
}

export default function AssistantAgentPage({
  params,
}: PageProps<"/[locale]/admin/assistant-agents/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AssistantAgentProfile params={params} />
    </Suspense>
  );
}

/** Loads the assistant agent: its id and actions, then its details. */
async function AssistantAgentProfile({
  params,
}: Pick<PageProps<"/[locale]/admin/assistant-agents/[id]">, "params">) {
  const assistantAgent = await loadAssistantAgent((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${assistantAgentsTable.path}/${encodeURIComponent(assistantAgent.id)}`}
        label={`${t("assistantAgents.singular")} ${assistantAgent.id}`}
      />
      <PageContentHeader>
        <PageContentTitle
          back={
            <PageContentBack
              label={t("assistantAgents.all")}
              render={<Link href={assistantAgentsTable.path} />}
            />
          }
        >
          {`${t("assistantAgents.singular")} ${assistantAgent.id}`}
        </PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <AssistantAgentDetailActions
            assistantAgent={assistantAgent}
            path={assistantAgentsTable.path}
          />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <AssistantAgentDetails assistantAgent={assistantAgent} />
      </PageContentBody>
    </PageContent>
  );
}
