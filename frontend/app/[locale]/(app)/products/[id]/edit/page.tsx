import type { Metadata } from "next";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductForm } from "../../product-form";
import { loadProduct } from "../load-product";

export const metadata: Metadata = { title: "Edit product" };

export default function EditProductPage({
  params,
}: PageProps<"/products/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditProduct params={params} />
    </Suspense>
  );
}

async function EditProduct({
  params,
}: Pick<PageProps<"/products/[id]/edit">, "params">) {
  const product = await loadProduct((await params).id);

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/products/${encodeURIComponent(product.id)}`}
        label={product.name}
      />
      <PageContentHeader>
        <PageContentTitle>Edit {product.name}</PageContentTitle>
        <PageContentDescription>
          Saving replaces the product&apos;s details.
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <ProductForm product={product} />
      </PageContentBody>
    </PageContent>
  );
}
