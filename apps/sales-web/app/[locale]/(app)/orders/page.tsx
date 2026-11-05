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
import { listOrders } from "@/lib/orders";
import { ordersTable } from "@/lib/orders-table";
import { requireUser } from "@/lib/session";
import { OrdersTable } from "./orders-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("orders.title") };
}

export default function OrdersPage({
  searchParams,
}: PageProps<"/[locale]/orders">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("orders.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button nativeButton={false} render={<Link href="/orders/new" />}>
            <PlusIcon data-icon="inline-start" />
            {t("orders.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <OrdersList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function OrdersList({
  searchParams,
}: Pick<PageProps<"/[locale]/orders">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, ordersTable);
  const data = await listOrders({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <OrdersTable orders={data.orders} total={data.total} params={params} />
  );
}
