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
import { OrderDetails } from "@dafne/frontend-sales-orders/components/order-detail";
import { OrderDetailActions } from "@dafne/frontend-sales-orders/components/order-detail-actions";
import { customersTable } from "@/lib/customers-table";
import { salesOrdersTable } from "@/lib/sales-orders-table";
import { loadOrder } from "./load-order";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrders.singular") };
}

export default function OrderPage({
  params,
}: PageProps<"/[locale]/sales-orders/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <OrderProfile params={params} />
    </Suspense>
  );
}

/** Loads the order: its name and actions, then its details. */
async function OrderProfile({
  params,
}: Pick<PageProps<"/[locale]/sales-orders/[id]">, "params">) {
  const order = await loadOrder((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${salesOrdersTable.path}/${encodeURIComponent(order.id)}`}
        label={`${t("salesOrders.singular")} ${order.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>{`${t("salesOrders.singular")} ${order.id}`}</PageContentTitle>
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
          <OrderDetailActions order={order} path={salesOrdersTable.path} />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <OrderDetails order={order} customersPath={customersTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
