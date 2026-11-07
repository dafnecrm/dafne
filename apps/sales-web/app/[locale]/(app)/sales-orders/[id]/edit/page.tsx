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
import { OrderForm } from "@dafne/frontend-sales-orders/components/order-form";
import { salesOrdersTable } from "@/lib/sales-orders-table";
import { loadOrder } from "../load-order";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrders.editMeta") };
}

export default function EditOrderPage({
  params,
}: PageProps<"/[locale]/sales-orders/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditOrder params={params} />
    </Suspense>
  );
}

async function EditOrder({
  params,
}: Pick<PageProps<"/[locale]/sales-orders/[id]/edit">, "params">) {
  const order = await loadOrder((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${salesOrdersTable.path}/${encodeURIComponent(order.id)}`}
        label={`${t("salesOrders.singular")} ${order.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("salesOrders.singular")} ${order.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("salesOrders.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <OrderForm order={order} path={salesOrdersTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
