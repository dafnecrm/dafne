import {
  BoxesLinkedIcon,
  CalendarIcon,
  CalendarPlusIcon,
  ContactIcon,
  EuroIcon,
  FingerprintIcon,
  HistoryIcon,
  ReceiptIcon,
  TagIcon,
  TextIcon,
  UserPenIcon,
  UserPlusIcon,
  HashIcon,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { formatCurrency } from "@dafne/frontend-ui/lib/currencies";
import { SalesOrderItemTable } from "../../components/sales-order-items-table.tsx";
import type { QuotationDetail } from "../types.ts";
import { QuotationStatusBadge } from "./quotation-status-badge.tsx";

/** @dafne-ignore: customerId, typeId */

/**
 * The details of a quotation: its fields, its items, then who created and
 * updated it. The customer links to `<customersPath>/<id>`, the items'
 * products to `<productsPath>/<id>`, its sales order (once accepted) to
 * `<salesOrdersPath>/<id>`.
 */
export function QuotationDetails({
  quotation,
  customersPath,
  productsPath,
  salesOrdersPath,
}: {
  quotation: QuotationDetail;
  customersPath: string;
  productsPath: string;
  salesOrdersPath: string;
}) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <>
      <DetailSection
        title={t("quotations.sections.details")}
        groupVariant="grid"
      >
        <Detail icon={BoxesLinkedIcon} label={t("quotations.fields.typeId")}>
          {quotation.type.description}
        </Detail>
        <Detail icon={ContactIcon} label={t("quotations.fields.customerId")}>
          <Link
            href={`${customersPath}/${encodeURIComponent(quotation.customer.id)}`}
            className="hover:underline"
          >
            {quotation.customer.name}
          </Link>
        </Detail>
        <Detail icon={TagIcon} label={t("quotations.fields.status")}>
          <QuotationStatusBadge status={quotation.status} />
        </Detail>
        <Detail icon={CalendarIcon} label={t("quotations.fields.validUntil")}>
          {quotation.validUntil ? (
            <LocalDate value={quotation.validUntil} format="longDate" />
          ) : (
            "—"
          )}
        </Detail>
        <Detail icon={EuroIcon} label={t("quotations.fields.total")}>
          {formatCurrency(
            quotation.items.reduce((total, item) => total + item.price, 0),
            locale,
          )}
        </Detail>
        {quotation.salesOrder && (
          <Detail icon={ReceiptIcon} label={t("quotations.fields.salesOrder")}>
            <Link
              href={`${salesOrdersPath}/${encodeURIComponent(quotation.salesOrder.id)}`}
              className="hover:underline"
            >
              {t("quotations.openSalesOrder", { id: quotation.salesOrder.id })}
            </Link>
          </Detail>
        )}
        <Detail icon={TextIcon} label={t("quotations.fields.notes")} wide>
          {quotation.notes ? (
            <span className="font-normal whitespace-pre-wrap">
              {quotation.notes}
            </span>
          ) : (
            "—"
          )}
        </Detail>
        <Detail icon={HashIcon} label={t("quotations.fields.itemsCount")}>
          {quotation.itemsCount}
        </Detail>
      </DetailSection>
      <DetailSection title={t("quotations.sections.items")}>
        <SalesOrderItemTable
          items={quotation.items.map((item) => ({
            ...item,
            baseUomId: item.product.uom.id,
            basePrice: item.product.price,
          }))}
          bordered={false}
          productsPath={productsPath}
        />
      </DetailSection>
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("quotations.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">{quotation.id}</code>
            <CopyButton
              variant="ghost"
              size="xs"
              value={String(quotation.id)}
            />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={quotation.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {quotation.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={quotation.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {quotation.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
