import { ArrowLeftIcon } from "lucide-react";
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
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Button } from "@dafne/frontend-ui/components/button";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { DocumentTemplateDetailActions } from "@dafne/frontend-documents/components/document-template-detail-actions";
import { DocumentTemplateDetails } from "@dafne/frontend-documents/components/document-template-detail";
import { listDocumentResources } from "@dafne/frontend-documents/server";
import { documentTemplatesTable } from "@/lib/document-templates-table";
import { loadDocumentTemplate } from "./load-document-template";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("documentTemplates.singular") };
}

export default function DocumentTemplatePage({
  params,
}: PageProps<"/[locale]/document-templates/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <DocumentTemplateProfile params={params} />
    </Suspense>
  );
}

/** Loads the document template: its id and actions, then its details. */
async function DocumentTemplateProfile({
  params,
}: Pick<PageProps<"/[locale]/document-templates/[id]">, "params">) {
  const [documentTemplate, resources] = await Promise.all([
    loadDocumentTemplate((await params).id),
    listDocumentResources(),
  ]);
  const t = await getTranslations();
  const placeholders = resources.find((option) => option.resource === documentTemplate.resource)?.placeholders ?? null;

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${documentTemplatesTable.path}/${encodeURIComponent(documentTemplate.id)}`}
        label={`${t("documentTemplates.singular")} ${documentTemplate.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>{documentTemplate.name}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={documentTemplatesTable.path} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("documentTemplates.all")}
          </Button>
          <DocumentTemplateDetailActions documentTemplate={documentTemplate} path={documentTemplatesTable.path} />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <DocumentTemplateDetails documentTemplate={documentTemplate} placeholders={placeholders} />
      </PageContentBody>
    </PageContent>
  );
}
