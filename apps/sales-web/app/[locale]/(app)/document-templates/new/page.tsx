import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { listDocumentResources } from "@/lib/document-templates";
import { DocumentTemplateForm } from "../document-template-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("documentTemplates.new") };
}

export default async function NewDocumentTemplatePage() {
  const t = await getTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("documentTemplates.new")}</PageContentTitle>
        <PageContentDescription>
          {t("documentTemplates.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <NewDocumentTemplateForm />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** The form, once the resources documents can be made for are loaded. */
async function NewDocumentTemplateForm() {
  return <DocumentTemplateForm resources={await listDocumentResources()} />;
}
