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
import { SalesOrderTypeForm } from "@dafne/frontend-sales-orders/sales-order-types/components/sales-order-type-form";
import { salesOrderTypesTable } from "@/lib/sales-order-types-table";
import { loadSalesOrderType } from "../load-sales-order-type";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrderTypes.editMeta") };
}

export default function EditSalesOrderTypePage({
  params,
}: PageProps<"/[locale]/sales-order-types/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditSalesOrderType params={params} />
    </Suspense>
  );
}

async function EditSalesOrderType({
  params,
}: Pick<PageProps<"/[locale]/sales-order-types/[id]/edit">, "params">) {
  const salesOrderType = await loadSalesOrderType((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${salesOrderTypesTable.path}/${encodeURIComponent(salesOrderType.id)}`}
        label={`${t("salesOrderTypes.singular")} ${salesOrderType.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", {
            name: `${t("salesOrderTypes.singular")} ${salesOrderType.id}`,
          })}
        </PageContentTitle>
        <PageContentDescription>
          {t("salesOrderTypes.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <SalesOrderTypeForm
          salesOrderType={salesOrderType}
          path={salesOrderTypesTable.path}
        />
      </PageContentBody>
    </PageContent>
  );
}
