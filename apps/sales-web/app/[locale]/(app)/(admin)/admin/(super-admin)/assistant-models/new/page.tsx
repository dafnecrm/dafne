import type { Metadata } from "next";
import { providerOptions } from "@/lib/assistant-options";
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
import { AssistantModelForm } from "@dafne/frontend-assistant/assistant-models/components/assistant-model-form";
import { assistantModelsTable } from "@/lib/assistant-models-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantModels.new") };
}

export default function NewAssistantModelPage() {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("assistantModels.new")}</PageContentTitle>
        <PageContentDescription>
          {t("assistantModels.newDescription")}
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
  return <AssistantModelForm providers={await providerOptions()} path={assistantModelsTable.path} />;
}
