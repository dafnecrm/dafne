import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { ProductForm } from "@dafne/frontend-products/components/product-form";
import { productsTable } from "@/lib/products-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("products");
  return { title: t("new") };
}

export default function NewProductPage() {
  const t = useTranslations("products");
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("new")}</PageContentTitle>
        <PageContentDescription>{t("newDescription")}</PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <ProductForm path={productsTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
