import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { SalesOrderTypeForm } from "@dafne/frontend-sales-orders/sales-order-types/components/sales-order-type-form";
import { salesOrderTypesTable } from "@/lib/sales-order-types-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("salesOrderTypes.new") };
}

export default function NewSalesOrderTypePage() {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("salesOrderTypes.new")}</PageContentTitle>
        <PageContentDescription>
          {t("salesOrderTypes.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <SalesOrderTypeForm path={salesOrderTypesTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
