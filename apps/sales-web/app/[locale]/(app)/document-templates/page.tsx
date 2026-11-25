import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Can } from "@dafne/frontend-permissions";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Button } from "@dafne/frontend-ui/components/button";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { getTableParams } from "@dafne/frontend-data-table";
import { DocumentTemplatesTable } from "@dafne/frontend-documents/components/document-templates-table";
import { listDocumentTemplates } from "@dafne/frontend-documents/server";
import { documentTemplatesTable } from "@/lib/document-templates-table";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("documentTemplates.title") };
}

export default function DocumentTemplatesPage({
  searchParams,
}: PageProps<"/[locale]/document-templates">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("documentTemplates.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Can I="create" a="DocumentTemplate">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`${documentTemplatesTable.path}/new`} />}
            >
              <PlusIcon data-icon="inline-start" />
              {t("documentTemplates.new")}
            </Button>
          </Can>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <DocumentTemplatesList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function DocumentTemplatesList({
  searchParams,
}: Pick<PageProps<"/[locale]/document-templates">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, documentTemplatesTable);
  const data = await listDocumentTemplates({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <DocumentTemplatesTable
      documentTemplates={data.items}
      total={data.total}
      params={params}
      config={documentTemplatesTable}
    />
  );
}
