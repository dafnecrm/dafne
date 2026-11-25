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
import { Can } from "@dafne/frontend-permissions";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { getTableParams } from "@dafne/frontend-data-table";
import { UomConversionsTable } from "@dafne/frontend-products/uom-conversions/components/uom-conversions-table";
import { listUomConversions } from "@dafne/frontend-products/uom-conversions/server";
import { uomConversionsTable } from "@/lib/uom-conversions-table";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("uomConversions.title") };
}

export default function UomConversionsPage({
  searchParams,
}: PageProps<"/[locale]/uom-conversions">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("uomConversions.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Can I="create" a="UomConversion">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`${uomConversionsTable.path}/new`} />}
            >
              <PlusIcon data-icon="inline-start" />
              {t("uomConversions.new")}
            </Button>
          </Can>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <UomConversionsList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function UomConversionsList({
  searchParams,
}: Pick<PageProps<"/[locale]/uom-conversions">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, uomConversionsTable);
  const data = await listUomConversions({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <UomConversionsTable
      config={uomConversionsTable}
      uomConversions={data.items}
      total={data.total}
      params={params}
    />
  );
}
