import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentBack,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { CustomerDetails } from "@dafne/frontend-customers/components/customer-detail";
import { CustomerDetailActions } from "@dafne/frontend-customers/components/customer-detail-actions";
import { CustomerSalesOrdersDetailSection } from "@dafne/frontend-sales-orders/components/customer-sales-orders";
import { customersTable } from "@/lib/customers-table";
import { salesOrdersTable } from "@/lib/sales-orders-table";
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
        <PageContentTitle
          back={
            <PageContentBack
              label={t("all")}
              render={<Link href="/customers" />}
            />
          }
        >
          {customer.name}
        </PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <CustomerDetailActions
            customer={customer}
            path={customersTable.path}
          />
        </PageContentAction>
      </PageContentHeader>

      <PageContentBody>
        <CustomerDetails customer={customer} path={customersTable.path}>
          <CustomerSalesOrdersDetailSection
            customerId={customer.id}
            path={salesOrdersTable.path}
          />
        </CustomerDetails>
      </PageContentBody>
    </PageContent>
  );
}
