import { ArrowLeftIcon, PencilIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerDetails } from "../customer-detail";
import { DeleteCustomerButton } from "../delete-customer-button";
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
  const editHref = `/customers/${encodeURIComponent(customer.id)}/edit`;

  return (
    <PageContent>
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
          <Button size="sm" nativeButton={false} render={<Link href={editHref} />}>
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
          <DeleteCustomerButton customer={customer} then="list" />
        </PageContentAction>
      </PageContentHeader>

      <PageContentBody>
        <CustomerDetails customer={customer} />
      </PageContentBody>
    </PageContent>
  );
}
