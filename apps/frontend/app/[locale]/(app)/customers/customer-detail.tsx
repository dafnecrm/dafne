import { useLocale, useTranslations } from "next-intl";
import { useOptionLabel } from "@/i18n/options";
import { countryName } from "@/lib/country-name";
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
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dafne/frontend-ui/components/table";
import type { CustomerDetail } from "@/lib/customers";
import {
  CUSTOMER_ADDRESS_TYPE_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
} from "@/lib/customers-table";

/** The details of a customer: type and tax data, contact, addresses, then who created and updated it. */
export function CustomerDetails({ customer }: { customer: CustomerDetail }) {
  const t = useTranslations();
  const locale = useLocale();
  const optionLabel = useOptionLabel();
  const editHref = `/customers/${encodeURIComponent(customer.id)}/edit`;

  return (
    <>
      <DetailSection title={t("customers.sections.details")}>
        <Detail icon={TagIcon} label={t("customers.fields.type")}>
          {optionLabel(CUSTOMER_TYPE_OPTIONS, customer.type)}
        </Detail>
        {/* Each type has its own fields (the other type's are always empty). */}
        {customer.type === "person" && (
          <Detail icon={CalendarIcon} label={t("customers.fields.birthDate")}>
            {customer.birthDate ? (
              <LocalDate value={customer.birthDate} format="longDate" />
            ) : (
              "—"
            )}
          </Detail>
        )}
        {customer.type === "person" && (
          <Detail icon={IdCardIcon} label={t("customers.fields.fiscalCode")}>
            {customer.fiscalCode ?? "—"}
          </Detail>
        )}
        {customer.type === "company" && (
          <Detail icon={Building2Icon} label={t("customers.fields.vatNumber")}>
            {customer.vatNumber ?? "—"}
          </Detail>
        )}
      </DetailSection>

      <DetailSection title={t("customers.sections.contact")}>
        <Detail icon={MailIcon} label={t("customers.fields.email")}>
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
        <Detail icon={PhoneIcon} label={t("customers.fields.phone")}>
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
        title={t("customers.sections.addressesCount", {
          count: customer.addresses.length,
        })}
        groupClassName="flex"
      >
        {customer.addresses.length ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("customers.addresses.fields.type")}</TableHead>
                  <TableHead>
                    {t("customers.addresses.fields.street")}
                  </TableHead>
                  <TableHead>
                    {t("customers.addresses.fields.postalCode")}
                  </TableHead>
                  <TableHead>{t("customers.addresses.fields.city")}</TableHead>
                  <TableHead>
                    {t("customers.addresses.fields.region")}
                  </TableHead>
                  <TableHead>
                    {t("customers.addresses.fields.country")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.addresses.map((address) => (
                  <TableRow key={address.id}>
                    <TableCell>
                      {optionLabel(CUSTOMER_ADDRESS_TYPE_OPTIONS, address.type)}
                    </TableCell>
                    <TableCell>{address.street}</TableCell>
                    <TableCell>{address.postalCode ?? "—"}</TableCell>
                    <TableCell>{address.city}</TableCell>
                    <TableCell>{address.region ?? "—"}</TableCell>
                    <TableCell>
                      {countryName(
                        address.countryCode,
                        locale,
                        address.country.name,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("customers.addresses.noneDetail")}{" "}
            <Link href={editHref} className="underline underline-offset-4">
              {t("customers.addresses.addOne")}
            </Link>
          </p>
        )}
      </DetailSection>

      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("customers.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-xs">{customer.id}</code>
            <CopyButton variant="ghost" value={customer.id} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={customer.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {customer.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={customer.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {customer.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
