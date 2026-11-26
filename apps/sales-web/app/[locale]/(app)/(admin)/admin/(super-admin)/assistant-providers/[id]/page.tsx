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
import { AssistantProviderDetails } from "@dafne/frontend-assistant/assistant-providers/components/assistant-provider-detail";
import { AssistantProviderDetailActions } from "@dafne/frontend-assistant/assistant-providers/components/assistant-provider-detail-actions";
import { AssistantProviderCheckButton } from "@dafne/frontend-assistant/assistant-providers/components/assistant-provider-check";
import { assistantProvidersTable } from "@/lib/assistant-providers-table";
import { loadAssistantProvider } from "./load-assistant-provider";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantProviders.singular") };
}

export default function AssistantProviderPage({
  params,
}: PageProps<"/[locale]/admin/assistant-providers/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AssistantProviderProfile params={params} />
    </Suspense>
  );
}

/** Loads the assistant provider: its id and actions, then its details. */
async function AssistantProviderProfile({
  params,
}: Pick<PageProps<"/[locale]/admin/assistant-providers/[id]">, "params">) {
  const assistantProvider = await loadAssistantProvider((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${assistantProvidersTable.path}/${encodeURIComponent(assistantProvider.id)}`}
        label={assistantProvider.name}
      />
      <PageContentHeader>
        <PageContentTitle
          back={
            <PageContentBack
              label={t("assistantProviders.all")}
              render={<Link href={assistantProvidersTable.path} />}
            />
          }
        >
          {assistantProvider.name}
        </PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <AssistantProviderDetailActions
            assistantProvider={assistantProvider}
            path={assistantProvidersTable.path}
          />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <AssistantProviderCheckButton assistantProvider={assistantProvider} />
        <AssistantProviderDetails assistantProvider={assistantProvider} />
      </PageContentBody>
    </PageContent>
  );
}
