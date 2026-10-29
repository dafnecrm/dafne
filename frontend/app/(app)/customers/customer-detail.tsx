import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  UserPenIcon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import { formatAddress, type CustomerDetail } from "@/lib/customers";

/** The details of a customer: contact, addresses, then who created and updated it. */
export function CustomerDetails({ customer }: { customer: CustomerDetail }) {
  const editHref = `/customers/${encodeURIComponent(customer.id)}/edit`;

  return (
    <>
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
    </>
  );
}
