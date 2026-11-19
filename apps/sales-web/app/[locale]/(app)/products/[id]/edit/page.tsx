import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
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
import { ProductForm } from "@dafne/frontend-products/components/product-form";
import { productsTable } from "@/lib/products-table";
import { listUomOptions } from "@dafne/frontend-products/uoms/server";
import { loadProduct } from "../load-product";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("products");
  return { title: t("editMeta") };
}

export default function EditProductPage({
  params,
}: PageProps<"/[locale]/products/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditProduct params={params} />
    </Suspense>
  );
}

async function EditProduct({
  params,
}: Pick<PageProps<"/[locale]/products/[id]/edit">, "params">) {
  const { id } = await params;
  const [product, units] = await Promise.all([loadProduct(id), listUomOptions()]);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${productsTable.path}/${encodeURIComponent(product.id)}`}
        label={product.name}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", { name: product.name })}
        </PageContentTitle>
        <PageContentDescription>
          {t("products.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <ProductForm product={product} units={units} path={productsTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
