import {
  ArrowLeftIcon,
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  UserPenIcon,
  UserPlusIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAddress, type CustomerDetail } from "@/lib/customers";
import { DeleteCustomerButton } from "../delete-customer-button";
import { loadCustomer } from "./load-customer";

export const metadata: Metadata = { title: "Customer" };

export default function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CustomerDetails params={params} />
    </Suspense>
  );
}

async function CustomerDetails({
  params,
}: Pick<PageProps<"/customers/[id]">, "params">) {
  return <CustomerProfile customer={await loadCustomer((await params).id)} />;
}

function CustomerProfile({ customer }: { customer: CustomerDetail }) {
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
        <DetailSection title="Contact">
          <Detail icon={MailIcon} label="Email">
            {customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                className="underline-offset-4 hover:underline"
              >
                {customer.email}
              </a>
            ) : (
              "—"
            )}
          </Detail>
          <Detail icon={PhoneIcon} label="Phone">
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="underline-offset-4 hover:underline"
              >
                {customer.phone}
              </a>
            ) : (
              "—"
            )}
          </Detail>
        </DetailSection>

        <DetailSection title={`Addresses (${customer.addresses.length})`}>
          {customer.addresses.length ? (
            customer.addresses.map((address, i) => (
              <Detail
                key={address.id}
                icon={MapPinIcon}
                label={address.label || `Address ${i + 1}`}
              >
                <span className="font-normal">{formatAddress(address)}</span>
              </Detail>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No addresses.{" "}
              <Link href={editHref} className="underline underline-offset-4">
                Add one
              </Link>
            </p>
          )}
        </DetailSection>

        <DetailSection title="Record">
          <Detail icon={FingerprintIcon} label="Customer ID">
            <div className="flex items-center gap-2">
              <code className="truncate font-mono text-xs">{customer.id}</code>
              <CopyButton variant="ghost" value={customer.id} />
            </div>
          </Detail>
          <Detail icon={CalendarPlusIcon} label="Created">
            <LocalDate value={customer.createdAt} format="dateTime" />
          </Detail>
          <Detail icon={UserPlusIcon} label="Created by">
            {customer.createdBy?.name ?? "—"}
          </Detail>
          <Detail icon={HistoryIcon} label="Updated">
            <LocalDate value={customer.updatedAt} format="dateTime" />
          </Detail>
          <Detail icon={UserPenIcon} label="Updated by">
            {customer.updatedBy?.name ?? "—"}
          </Detail>
        </DetailSection>
      </PageContentBody>
    </PageContent>
  );
}
