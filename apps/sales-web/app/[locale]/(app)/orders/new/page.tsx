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
import { OrderForm } from "../order-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("orders.new") };
}

export default function NewOrderPage() {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("orders.new")}</PageContentTitle>
        <PageContentDescription>
          {t("orders.newDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <OrderForm />
      </PageContentBody>
    </PageContent>
  );
}
