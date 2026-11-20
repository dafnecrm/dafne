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
import { DocumentTemplateForm } from "../../document-template-form";
import { listDocumentResources } from "@/lib/document-templates";
import { loadDocumentTemplate } from "../load-document-template";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("documentTemplates.editMeta") };
}

export default function EditDocumentTemplatePage({
  params,
}: PageProps<"/[locale]/document-templates/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditDocumentTemplate params={params} />
    </Suspense>
  );
}

async function EditDocumentTemplate({
  params,
}: Pick<PageProps<"/[locale]/document-templates/[id]/edit">, "params">) {
  const [documentTemplate, resources] = await Promise.all([
    loadDocumentTemplate((await params).id),
    listDocumentResources(),
  ]);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/document-templates/${encodeURIComponent(documentTemplate.id)}`}
        label={`${t("documentTemplates.singular")} ${documentTemplate.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("documentTemplates.singular")} ${documentTemplate.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("documentTemplates.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <DocumentTemplateForm documentTemplate={documentTemplate} resources={resources} />
      </PageContentBody>
    </PageContent>
  );
}
