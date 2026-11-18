import type { Metadata } from "next";
import { groupOptions, modelOptions } from "@/lib/assistant-options";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { AssistantAgentForm } from "@dafne/frontend-assistant/assistant-agents/components/assistant-agent-form";
import { assistantAgentsTable } from "@/lib/assistant-agents-table";
import { loadAssistantAgent } from "../load-assistant-agent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantAgents.editMeta") };
}

export default function EditAssistantAgentPage({
  params,
}: PageProps<"/[locale]/admin/assistant-agents/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditAssistantAgent params={params} />
    </Suspense>
  );
}

async function EditAssistantAgent({
  params,
}: Pick<PageProps<"/[locale]/admin/assistant-agents/[id]/edit">, "params">) {
  const assistantAgent = await loadAssistantAgent((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${assistantAgentsTable.path}/${encodeURIComponent(assistantAgent.id)}`}
        label={`${t("assistantAgents.singular")} ${assistantAgent.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("assistantAgents.singular")} ${assistantAgent.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("assistantAgents.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <AssistantAgentForm
          models={await modelOptions()}
          groups={await groupOptions()}
          assistantAgent={assistantAgent}
          path={assistantAgentsTable.path}
        />
      </PageContentBody>
    </PageContent>
  );
}
