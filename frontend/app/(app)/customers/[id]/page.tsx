import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerDetails } from "../customer-detail";
import { CustomerDetailActions } from "../customer-detail-actions";
import { loadCustomer } from "./load-customer";

export const metadata: Metadata = { title: "Customer" };

export default function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CustomerProfile params={params} />
    </Suspense>
  );
}

/** Loads the customer: their name and actions, then their details. */
async function CustomerProfile({
  params,
}: Pick<PageProps<"/customers/[id]">, "params">) {
  const customer = await loadCustomer((await params).id);

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
            All customers
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
