import type { Metadata } from "next";
import { groupOptions, modelOptions } from "@/lib/assistant-options";
import { Suspense } from "react";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { AssistantAgentForm } from "@dafne/frontend-assistant/assistant-agents/components/assistant-agent-form";
import { assistantAgentsTable } from "@/lib/assistant-agents-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantAgents.new") };
}

export default function NewAssistantAgentPage() {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("assistantAgents.new")}</PageContentTitle>
        <PageContentDescription>
          {t("assistantAgents.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        {/* The options are read per request. */}
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <NewForm />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

async function NewForm() {
  const [models, groups] = await Promise.all([modelOptions(), groupOptions()]);
  return <AssistantAgentForm models={models} groups={groups} path={assistantAgentsTable.path} />;
}
