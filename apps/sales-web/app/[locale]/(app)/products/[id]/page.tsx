import { getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { ProductDetails } from "@dafne/frontend-products/components/product-detail";
import { ProductDetailActions } from "@dafne/frontend-products/components/product-detail-actions";
import { productsTable } from "@/lib/products-table";
import { loadProduct } from "./load-product";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("products");
  return { title: t("singular") };
}

export default function ProductPage({
  params,
}: PageProps<"/[locale]/products/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProductProfile params={params} />
    </Suspense>
  );
}

/** Loads the product: its name and actions, then its details. */
async function ProductProfile({
  params,
}: Pick<PageProps<"/[locale]/products/[id]">, "params">) {
  const product = await loadProduct((await params).id);
  const t = await getTranslations("products");

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`${productsTable.path}/${encodeURIComponent(product.id)}`}
        label={product.name}
      />
      <PageContentHeader>
        <PageContentTitle>{product.name}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={productsTable.path} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("all")}
          </Button>
          <ProductDetailActions product={product} path={productsTable.path} />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <ProductDetails product={product} />
      </PageContentBody>
    </PageContent>
  );
}
