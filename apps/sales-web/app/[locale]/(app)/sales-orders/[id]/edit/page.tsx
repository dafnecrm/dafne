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
import { SalesOrderForm } from "@dafne/frontend-sales-orders/components/sales-order-form";
import { salesOrdersTable } from "@/lib/sales-orders-table";
import { loadSalesOrder } from "../load-sales-order";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrders.editMeta") };
}

export default function EditSalesOrderPage({
  params,
}: PageProps<"/[locale]/sales-orders/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditSalesOrder params={params} />
    </Suspense>
  );
}

async function EditSalesOrder({
  params,
}: Pick<PageProps<"/[locale]/sales-orders/[id]/edit">, "params">) {
  const salesOrder = await loadSalesOrder((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${salesOrdersTable.path}/${encodeURIComponent(salesOrder.id)}`}
        label={`${t("salesOrders.singular")} ${salesOrder.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("salesOrders.singular")} ${salesOrder.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("salesOrders.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <SalesOrderForm
          salesOrder={salesOrder}
          path={salesOrdersTable.path}
        />
      </PageContentBody>
    </PageContent>
  );
}
