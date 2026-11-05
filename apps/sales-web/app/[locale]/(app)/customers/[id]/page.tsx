import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Button } from "@dafne/frontend-ui/components/button";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { CustomerDetails } from "../customer-detail";
import { CustomerDetailActions } from "../customer-detail-actions";
import { loadCustomer } from "./load-customer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers");
  return { title: t("singular") };
}

export default function CustomerPage({
  params,
}: PageProps<"/[locale]/customers/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CustomerProfile params={params} />
    </Suspense>
  );
}

/** Loads the customer: their name and actions, then their details. */
async function CustomerProfile({
  params,
}: Pick<PageProps<"/[locale]/customers/[id]">, "params">) {
  const customer = await loadCustomer((await params).id);
  const t = await getTranslations("customers");

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/customers/${encodeURIComponent(customer.id)}`}
        label={customer.name}
      />
      <PageContentHeader>
        <PageContentTitle>{customer.name}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/customers" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("all")}
          </Button>
          <CustomerDetailActions customer={customer} />
        </PageContentAction>
      </PageContentHeader>

      <PageContentBody>
        <CustomerDetails customer={customer} />
      </PageContentBody>
    </PageContent>
  );
}
