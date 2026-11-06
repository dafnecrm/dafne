import { useLocale, useTranslations } from "next-intl";
import { useOptionLabel } from "@/i18n/options";
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
  Building2Icon
} from "lucide-react";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { CustomerDetail } from "@/lib/customers";
import {
  CUSTOMER_TYPE_OPTIONS
} from "@/lib/customers-table";
import { CustomerAddressTable } from "./customer-address-table";

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
        <CustomerAddressTable customerId={customer.id} addresses={customer.addresses} />
      </DetailSection>

      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("customers.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-xs">{customer.id}</code>
            <CopyButton variant="ghost" value={String(customer.id)} />
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
