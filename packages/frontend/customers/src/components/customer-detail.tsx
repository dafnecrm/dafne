import { useTranslations } from "next-intl";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
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
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { PlainDate } from "@dafne/frontend-ui/components/plain-date";
import type { CustomerDetail } from "../types.ts";
import { CUSTOMER_TYPE_OPTIONS } from "../customers-table.ts";
import { CustomerAddressTable } from "./customer-address-table.tsx";

/**
 * The details of a customer: type and tax data, contact, addresses, then
 * who created and updated it. `path` is the app's customers list.
 */
export function CustomerDetails({
  customer,
  path,
}: {
  customer: CustomerDetail;
  path: string;
}) {
  const t = useTranslations();
  const optionLabel = useOptionLabel();

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
              <PlainDate value={customer.birthDate} format="longDate" />
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
        <CustomerAddressTable
          customerId={customer.id}
          addresses={customer.addresses}
          path={path}
        />
      </DetailSection>

      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("customers.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">{customer.id}</code>
            <CopyButton variant="ghost" size="xs" value={String(customer.id)} />
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
