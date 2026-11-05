import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
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
} from "@dafne/frontend-ui/components/page-content";
import { Button } from "@dafne/frontend-ui/components/button";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { getTableParams } from "@dafne/frontend-data-table";
import { listProducts } from "@/lib/products";
import { productsTable } from "@/lib/products-table";
import { requireUser } from "@/lib/session";
import { ProductsTable } from "./products-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("products");
  return { title: t("title") };
}

export default function ProductsPage({
  searchParams,
}: PageProps<"/[locale]/products">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("products.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button nativeButton={false} render={<Link href="/products/new" />}>
            <PlusIcon data-icon="inline-start" />
            {t("products.new")}
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
}: Pick<PageProps<"/[locale]/products">, "searchParams">) {
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
