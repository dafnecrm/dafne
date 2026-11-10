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
import { listSalesOrders } from "@dafne/frontend-sales-orders/server";
import { salesOrdersTable } from "@/lib/sales-orders-table";
import { requireUser } from "@/lib/session";
import { SalesOrdersTable } from "@dafne/frontend-sales-orders/components/sales-orders-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrders.title") };
}

export default function SalesOrdersPage({
  searchParams,
}: PageProps<"/[locale]/sales-orders">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("salesOrders.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button
            nativeButton={false}
            render={<Link href={`${salesOrdersTable.path}/new`} />}
          >
            <PlusIcon data-icon="inline-start" />
            {t("salesOrders.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <SalesOrdersList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function SalesOrdersList({
  searchParams,
}: Pick<PageProps<"/[locale]/sales-orders">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, salesOrdersTable);
  const data = await listSalesOrders({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <SalesOrdersTable
      config={salesOrdersTable}
      salesOrders={data.salesOrders}
      total={data.total}
      params={params}
    />
  );
}
