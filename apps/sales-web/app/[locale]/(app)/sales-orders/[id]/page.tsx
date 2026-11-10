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
import { SalesOrderDetails } from "@dafne/frontend-sales-orders/components/sales-order-detail";
import { SalesOrderDetailActions } from "@dafne/frontend-sales-orders/components/sales-order-detail-actions";
import { customersTable } from "@/lib/customers-table";
import { salesOrdersTable } from "@/lib/sales-orders-table";
import { loadSalesOrder } from "./load-sales-order";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrders.singular") };
}

export default function SalesOrderPage({
  params,
}: PageProps<"/[locale]/sales-orders/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SalesOrderProfile params={params} />
    </Suspense>
  );
}

/** Loads the sales order: its name and actions, then its details. */
async function SalesOrderProfile({
  params,
}: Pick<PageProps<"/[locale]/sales-orders/[id]">, "params">) {
  const salesOrder = await loadSalesOrder((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${salesOrdersTable.path}/${encodeURIComponent(salesOrder.id)}`}
        label={`${t("salesOrders.singular")} ${salesOrder.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>{`${t("salesOrders.singular")} ${salesOrder.id}`}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={salesOrdersTable.path} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("salesOrders.all")}
          </Button>
          <SalesOrderDetailActions
            salesOrder={salesOrder}
            path={salesOrdersTable.path}
          />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <SalesOrderDetails
          salesOrder={salesOrder}
          path={salesOrdersTable.path}
          customersPath={customersTable.path}
        />
      </PageContentBody>
    </PageContent>
  );
}
