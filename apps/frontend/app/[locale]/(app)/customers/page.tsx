import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
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
import { listCustomers } from "@/lib/customers";
import { customersTable } from "@/lib/customers-table";
import { getTableParams } from "@/lib/data-table";
import { requireUser } from "@/lib/session";
import { CustomersTable } from "./customers-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers");
  return { title: t("title") };
}

export default function CustomersPage({
  searchParams,
}: PageProps<"/[locale]/customers">) {
  const t = useTranslations();
  return (
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>{t("customers.title")}</PageContentTitle>
        <PageContentDescription>{t("common.listHint")}</PageContentDescription>
        <PageContentAction>
          <Button nativeButton={false} render={<Link href="/customers/new" />}>
            <PlusIcon data-icon="inline-start" />
            {t("customers.new")}
          </Button>
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        {/* The session and the query are read per request. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <CustomersList searchParams={searchParams} />
        </Suspense>
      </PageContentBody>
    </PageContent>
  );
}

/** Fetches one page; the client table renders it. */
async function CustomersList({
  searchParams,
}: Pick<PageProps<"/[locale]/customers">, "searchParams">) {
  await requireUser();
  const params = getTableParams(await searchParams, customersTable);
  const data = await listCustomers({
    limit: params.pageSize,
    offset: params.offset,
    filters: params.filters,
    sort: params.sort,
  });

  return (
    <CustomersTable
      customers={data.customers}
      total={data.total}
      params={params}
    />
  );
}
