import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { AssistantProviderForm } from "@dafne/frontend-assistant/assistant-providers/components/assistant-provider-form";
import { assistantProvidersTable } from "@/lib/assistant-providers-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("assistantProviders.new") };
}

export default function NewAssistantProviderPage() {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("assistantProviders.new")}</PageContentTitle>
        <PageContentDescription>
          {t("assistantProviders.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <AssistantProviderForm path={assistantProvidersTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
