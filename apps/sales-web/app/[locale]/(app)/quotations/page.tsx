import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { QuotationsTable } from "@dafne/frontend-sales-orders/quotations/components/quotations-table";
import { listQuotations } from "@dafne/frontend-sales-orders/quotations/server";
import { quotationsTable } from "@/lib/quotations-table";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("quotations.title") };
}

export default function QuotationsPage({
  searchParams,
}: PageProps<"/[locale]/quotations">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("quotations.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button
            nativeButton={false}
            render={<Link href={`${quotationsTable.path}/new`} />}
          >
            <PlusIcon data-icon="inline-start" />
            {t("quotations.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <QuotationsList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function QuotationsList({
  searchParams,
}: Pick<PageProps<"/[locale]/quotations">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, quotationsTable);
  const data = await listQuotations({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <QuotationsTable
      config={quotationsTable}
      quotations={data.items}
      total={data.total}
      params={params}
    />
  );
}
