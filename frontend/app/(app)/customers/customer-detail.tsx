import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  MailIcon,
  PhoneIcon,
  UserPenIcon,
  UserPlusIcon,
  TagIcon,
  CalendarIcon,
  IdCardIcon,
  Building2Icon,
} from "lucide-react";
import Link from "next/link";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CustomerDetail } from "@/lib/customers";
import {
  CUSTOMER_ADDRESS_TYPE_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
} from "@/lib/customers-table";

/** The details of a customer: type and tax data, contact, addresses, then who created and updated it. */
export function CustomerDetails({ customer }: { customer: CustomerDetail }) {
  const editHref = `/customers/${encodeURIComponent(customer.id)}/edit`;

  return (
    <>
      <DetailSection title="Details">
        <Detail icon={TagIcon} label="Type">
          {CUSTOMER_TYPE_OPTIONS.find((o) => o.value === customer.type)
            ?.label ?? "—"}
        </Detail>
        {/* Each type has its own fields (the other type's are always empty). */}
        {customer.type === "person" && (
          <Detail icon={CalendarIcon} label="Birth date">
            {customer.birthDate ? (
              <LocalDate value={customer.birthDate} format="longDate" />
            ) : (
              "—"
            )}
          </Detail>
        )}
        {customer.type === "person" && (
          <Detail icon={IdCardIcon} label="Fiscal code">
            {customer.fiscalCode ?? "—"}
          </Detail>
        )}
        {customer.type === "company" && (
          <Detail icon={Building2Icon} label="VAT number">
            {customer.vatNumber ?? "—"}
          </Detail>
        )}
      </DetailSection>

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

      <DetailSection
        title={`Addresses (${customer.addresses.length})`}
        groupClassName="flex"
      >
        {customer.addresses.length ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Street</TableHead>
                  <TableHead>Postal code</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State / province</TableHead>
                  <TableHead>Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.addresses.map((address) => (
                  <TableRow key={address.id}>
                    <TableCell>
                      {CUSTOMER_ADDRESS_TYPE_OPTIONS.find(
                        (o) => o.value === address.type,
                      )?.label ?? "—"}
                    </TableCell>
                    <TableCell>{address.street}</TableCell>
                    <TableCell>{address.postalCode ?? "—"}</TableCell>
                    <TableCell>{address.city}</TableCell>
                    <TableCell>{address.region ?? "—"}</TableCell>
                    <TableCell>{address.country}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
