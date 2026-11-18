import type { Metadata } from "next";
import { providerOptions } from "@/lib/assistant-options";
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
import { AssistantModelForm } from "@dafne/frontend-assistant/assistant-models/components/assistant-model-form";
import { assistantModelsTable } from "@/lib/assistant-models-table";
import { loadAssistantModel } from "../load-assistant-model";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantModels.editMeta") };
}

export default function EditAssistantModelPage({
  params,
}: PageProps<"/[locale]/admin/assistant-models/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditAssistantModel params={params} />
    </Suspense>
  );
}

async function EditAssistantModel({
  params,
}: Pick<PageProps<"/[locale]/admin/assistant-models/[id]/edit">, "params">) {
  const assistantModel = await loadAssistantModel((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${assistantModelsTable.path}/${encodeURIComponent(assistantModel.id)}`}
        label={`${t("assistantModels.singular")} ${assistantModel.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("assistantModels.singular")} ${assistantModel.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("assistantModels.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <AssistantModelForm
          providers={await providerOptions()}
          assistantModel={assistantModel}
          path={assistantModelsTable.path}
        />
      </PageContentBody>
    </PageContent>
  );
}
