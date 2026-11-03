import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTableParams } from "@/lib/data-table";
import { listProducts } from "@/lib/products";
import { productsTable } from "@/lib/products-table";
import { requireUser } from "@/lib/session";
import { ProductsTable } from "./products-table";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>Products</PageContentTitle>
        <PageContentDescription>
          Filter by a field, or click a column to sort.
        </PageContentDescription>
        <PageContentAction>
          <Button nativeButton={false} render={<Link href="/products/new" />}>
            <PlusIcon data-icon="inline-start" />
            New product
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <ProductsList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function ProductsList({
  searchParams,
}: Pick<PageProps<"/products">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, productsTable);
  const data = await listProducts({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <ProductsTable
      products={data.products}
      total={data.total}
      params={params}
    />
  );
}
