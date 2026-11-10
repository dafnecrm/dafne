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
import { SalesOrderTypesTable } from "@dafne/frontend-sales-orders/sales-order-types/components/sales-order-types-table";
import { listSalesOrderTypes } from "@dafne/frontend-sales-orders/sales-order-types/server";
import { salesOrderTypesTable } from "@/lib/sales-order-types-table";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrderTypes.title") };
}

export default function SalesOrderTypesPage({
  searchParams,
}: PageProps<"/[locale]/admin/sales-order-types">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("salesOrderTypes.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button
            nativeButton={false}
            render={<Link href={`${salesOrderTypesTable.path}/new`} />}
          >
            <PlusIcon data-icon="inline-start" />
            {t("salesOrderTypes.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <SalesOrderTypesList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function SalesOrderTypesList({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/sales-order-types">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, salesOrderTypesTable);
  const data = await listSalesOrderTypes({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <SalesOrderTypesTable
      config={salesOrderTypesTable}
      salesOrderTypes={data.salesOrderTypes}
      total={data.total}
      params={params}
    />
  );
}
