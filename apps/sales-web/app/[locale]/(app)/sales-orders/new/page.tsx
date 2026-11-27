import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { SalesOrderForm } from "@dafne/frontend-sales-orders/components/sales-order-form";
import { getSalesOrderNextStatuses } from "@dafne/frontend-sales-orders/server";
import { salesOrdersTable } from "@/lib/sales-orders-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrders.new") };
}

export default function NewSalesOrderPage() {
  const t = useTranslations();

  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("salesOrders.new")}</PageContentTitle>
        <PageContentDescription>
          {t("salesOrders.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        {/* The types are read per request. */}
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <NewSalesOrderForm />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Loads the statuses a draft can move to (the status select's options), then the form. */
async function NewSalesOrderForm() {
  const nextStatuses = await getSalesOrderNextStatuses("draft");
  return (
    <SalesOrderForm path={salesOrdersTable.path} nextStatuses={nextStatuses} />
  );
}
