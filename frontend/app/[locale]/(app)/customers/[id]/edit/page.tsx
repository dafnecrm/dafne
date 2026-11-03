import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerForm } from "../../customer-form";
import { loadCustomer } from "../load-customer";

export const metadata: Metadata = { title: "Edit customer" };

export default function EditCustomerPage({
  params,
}: PageProps<"/customers/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditCustomer params={params} />
    </Suspense>
  );
}

async function EditCustomer({
  params,
}: Pick<PageProps<"/customers/[id]/edit">, "params">) {
  const customer = await loadCustomer((await params).id);

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/customers/${encodeURIComponent(customer.id)}`}
        label={customer.name}
      />
      <PageContentHeader>
        <PageContentTitle>Edit {customer.name}</PageContentTitle>
        <PageContentDescription>
          Saving replaces the customer&apos;s details and addresses.
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <CustomerForm customer={customer} />
      </PageContentBody>
    </PageContent>
  );
}
