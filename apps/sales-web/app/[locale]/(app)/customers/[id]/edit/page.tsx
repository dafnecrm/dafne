import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { CustomerForm } from "@dafne/frontend-customers/components/customer-form";
import { customersTable } from "@/lib/customers-table";
import { loadCustomer } from "../load-customer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers");
  return { title: t("editMeta") };
}

export default function EditCustomerPage({
  params,
}: PageProps<"/[locale]/customers/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditCustomer params={params} />
    </Suspense>
  );
}

async function EditCustomer({
  params,
}: Pick<PageProps<"/[locale]/customers/[id]/edit">, "params">) {
  const customer = await loadCustomer((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/customers/${encodeURIComponent(customer.id)}`}
        label={customer.name}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", { name: customer.name })}
        </PageContentTitle>
        <PageContentDescription>
          {t("customers.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <CustomerForm customer={customer} path={customersTable.path} />
      </PageContentBody>
    </PageContent>
  );
}
