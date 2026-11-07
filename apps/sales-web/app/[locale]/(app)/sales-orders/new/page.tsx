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
import { SalesOrderForm } from "@dafne/frontend-sales-orders/components/sales-order-form";
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
        <SalesOrderForm path={salesOrdersTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
