import type { Metadata } from "next";
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
import { AssistantProviderForm } from "@dafne/frontend-assistant/assistant-providers/components/assistant-provider-form";
import { assistantProvidersTable } from "@/lib/assistant-providers-table";
import { loadAssistantProvider } from "../load-assistant-provider";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantProviders.editMeta") };
}

export default function EditAssistantProviderPage({
  params,
}: PageProps<"/[locale]/admin/assistant-providers/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditAssistantProvider params={params} />
    </Suspense>
  );
}

async function EditAssistantProvider({
  params,
}: Pick<PageProps<"/[locale]/admin/assistant-providers/[id]/edit">, "params">) {
  const assistantProvider = await loadAssistantProvider((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${assistantProvidersTable.path}/${encodeURIComponent(assistantProvider.id)}`}
        label={`${t("assistantProviders.singular")} ${assistantProvider.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("assistantProviders.singular")} ${assistantProvider.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("assistantProviders.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <AssistantProviderForm
          assistantProvider={assistantProvider}
          path={assistantProvidersTable.path}
        />
      </PageContentBody>
    </PageContent>
  );
}
