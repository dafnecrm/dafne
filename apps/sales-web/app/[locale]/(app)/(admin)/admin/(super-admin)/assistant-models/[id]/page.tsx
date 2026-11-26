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
import { AssistantModelDetails } from "@dafne/frontend-assistant/assistant-models/components/assistant-model-detail";
import { AssistantModelDetailActions } from "@dafne/frontend-assistant/assistant-models/components/assistant-model-detail-actions";
import { assistantModelsTable } from "@/lib/assistant-models-table";
import { loadAssistantModel } from "./load-assistant-model";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantModels.singular") };
}

export default function AssistantModelPage({
  params,
}: PageProps<"/[locale]/admin/assistant-models/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AssistantModelProfile params={params} />
    </Suspense>
  );
}

/** Loads the assistant model: its id and actions, then its details. */
async function AssistantModelProfile({
  params,
}: Pick<PageProps<"/[locale]/admin/assistant-models/[id]">, "params">) {
  const assistantModel = await loadAssistantModel((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${assistantModelsTable.path}/${encodeURIComponent(assistantModel.id)}`}
        label={`${t("assistantModels.singular")} ${assistantModel.id}`}
      />
      <PageContentHeader>
        <PageContentTitle
          back={
            <PageContentBack
              label={t("assistantModels.all")}
              render={<Link href={assistantModelsTable.path} />}
            />
          }
        >
          {`${t("assistantModels.singular")} ${assistantModel.id}`}
        </PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <AssistantModelDetailActions
            assistantModel={assistantModel}
            path={assistantModelsTable.path}
          />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <AssistantModelDetails assistantModel={assistantModel} />
      </PageContentBody>
    </PageContent>
  );
}
