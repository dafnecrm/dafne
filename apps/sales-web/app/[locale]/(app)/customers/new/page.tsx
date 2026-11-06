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
import { CustomerForm } from "@dafne/frontend-customers/components/customer-form";
import { customersTable } from "@/lib/customers-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers");
  return { title: t("new") };
}

export default function NewCustomerPage() {
  const t = useTranslations("customers");
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("new")}</PageContentTitle>
        <PageContentDescription>{t("newDescription")}</PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <CustomerForm path={customersTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
