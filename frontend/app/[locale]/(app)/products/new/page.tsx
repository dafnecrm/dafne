import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { ProductForm } from "../product-form";

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
        <ProductForm />
      </PageContentBody>
    </PageContent>
  );
}
