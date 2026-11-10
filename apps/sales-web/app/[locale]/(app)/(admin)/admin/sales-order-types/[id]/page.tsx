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
import { SalesOrderTypeDetails } from "@dafne/frontend-sales-orders/sales-order-types/components/sales-order-type-detail";
import { SalesOrderTypeDetailActions } from "@dafne/frontend-sales-orders/sales-order-types/components/sales-order-type-detail-actions";
import { salesOrderTypesTable } from "@/lib/sales-order-types-table";
import { loadSalesOrderType } from "./load-sales-order-type";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrderTypes.singular") };
}

export default function SalesOrderTypePage({
  params,
}: PageProps<"/[locale]/sales-order-types/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SalesOrderTypeProfile params={params} />
    </Suspense>
  );
}

/** Loads the sales order type: its id and actions, then its details. */
async function SalesOrderTypeProfile({
  params,
}: Pick<PageProps<"/[locale]/sales-order-types/[id]">, "params">) {
  const salesOrderType = await loadSalesOrderType((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${salesOrderTypesTable.path}/${encodeURIComponent(salesOrderType.id)}`}
        label={`${t("salesOrderTypes.singular")} ${salesOrderType.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>{`${t("salesOrderTypes.singular")} ${salesOrderType.id}`}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={salesOrderTypesTable.path} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("salesOrderTypes.all")}
          </Button>
          <SalesOrderTypeDetailActions
            salesOrderType={salesOrderType}
            path={salesOrderTypesTable.path}
          />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <SalesOrderTypeDetails salesOrderType={salesOrderType} />
      </PageContentBody>
    </PageContent>
  );
}
