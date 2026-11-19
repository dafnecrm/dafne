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
import { Suspense } from "react";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { ProductForm } from "@dafne/frontend-products/components/product-form";
import { listUomOptions } from "@dafne/frontend-products/uoms/server";
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
        {/* The units are read per request. */}
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <NewProduct />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

async function NewProduct() {
  return <ProductForm units={await listUomOptions()} path={productsTable.path} />;
}
