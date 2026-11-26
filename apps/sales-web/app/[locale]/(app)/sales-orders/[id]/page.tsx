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
  PageContentBack,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { SalesOrderDetails } from "@dafne/frontend-sales-orders/components/sales-order-detail";
import { SalesOrderDetailActions } from "@dafne/frontend-sales-orders/components/sales-order-detail-actions";
import { customersTable } from "@/lib/customers-table";
import { productsTable } from "@/lib/products-table";
import { salesOrdersTable } from "@/lib/sales-orders-table";
import { quotationsTable } from "@/lib/quotations-table";
import { loadSalesOrder } from "./load-sales-order";
import { listTemplatesFor } from "@dafne/frontend-documents/server";

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
  const [salesOrder, templates, t] = await Promise.all([
    loadSalesOrder((await params).id),
    listTemplatesFor("salesOrder"),
    getTranslations()
  ]);

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${salesOrdersTable.path}/${encodeURIComponent(salesOrder.id)}`}
        label={`${t("salesOrders.singular")} ${salesOrder.id}`}
      />
      <PageContentHeader>
        <PageContentTitle
          back={
            <PageContentBack
              label={t("salesOrders.all")}
              render={<Link href={salesOrdersTable.path} />}
            />
          }
        >
          {`${t("salesOrders.singular")} ${salesOrder.id}`}
        </PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <SalesOrderDetailActions
            salesOrder={salesOrder}
            path={salesOrdersTable.path}
            pdfTemplates={templates}
          />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <SalesOrderDetails
          salesOrder={salesOrder}
          customersPath={customersTable.path}
          productsPath={productsTable.path}
          quotationsPath={quotationsTable.path}
        />
      </PageContentBody>
    </PageContent>
  );
}
