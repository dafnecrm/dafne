import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
  ContactIcon,
  BoxesLinkedIcon,
  TagIcon,
  EuroIcon,
  FileTextIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { SalesOrderDetail } from "../types.ts";
import Link from "next/link";
import { SalesOrderItemTable } from "./sales-order-items-table.tsx";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { formatCurrency } from "@dafne/frontend-ui/lib/currencies";
import { SalesOrderStatusBadge } from "./sales-order-status-badge.tsx";

/** @dafne-ignore: customerId, typeId */

/**
 * The details of a sales order: its fields, then who created and updated it.
 * The customer links to `<customersPath>/<id>`, the app's customer page,
 * the items' products to `<productsPath>/<id>`, the quotation it was made
 * from (if any) to `<quotationsPath>/<id>`.
 */
export function SalesOrderDetails({
  salesOrder,
  customersPath,
  productsPath,
  quotationsPath,
}: {
  salesOrder: SalesOrderDetail;
  customersPath: string;
  productsPath: string;
  quotationsPath?: string;
}) {
  const t = useTranslations();
  const locale = useLocale()
  
  return (
    <>
      <DetailSection
        title={t("salesOrders.sections.details")}
        groupVariant="grid"
      >
        <Detail icon={BoxesLinkedIcon} label={t("salesOrders.fields.type")}>
          {salesOrder.type.description}
        </Detail>
        <Detail icon={ContactIcon} label={t("salesOrders.fields.customer")}>
          <Link
            href={`${customersPath}/${encodeURIComponent(salesOrder.customer.id)}`}
            className="hover:underline"
          >
            {salesOrder.customer.name}
          </Link>
        </Detail>
        <Detail icon={TagIcon} label={t("salesOrders.fields.status")}>
          <SalesOrderStatusBadge status={salesOrder.status} />
        </Detail>
        <Detail icon={EuroIcon} label={t("salesOrders.totalPrice")}>
          {formatCurrency(salesOrder.items.reduce((total, item) => {
            total += item.price;
            return total;
          }, 0), locale)}
        </Detail>
        {salesOrder.quotationId != null && (
          <Detail icon={FileTextIcon} label={t("quotations.singular")}>
            {quotationsPath ? (
              <Link
                href={`${quotationsPath}/${encodeURIComponent(salesOrder.quotationId)}`}
                className="hover:underline"
              >
                {t("quotations.fromQuotation", { id: salesOrder.quotationId })}
              </Link>
            ) : (
              t("quotations.fromQuotation", { id: salesOrder.quotationId })
            )}
          </Detail>
        )}
        <Detail icon={TextIcon} label={t("salesOrders.fields.notes")} wide>
          {salesOrder.notes ? (
            <span className="font-normal whitespace-pre-wrap">
              {salesOrder.notes}
            </span>
          ) : (
            "—"
          )}
        </Detail>
      </DetailSection>
      <DetailSection title={t("salesOrders.sections.items")}>
        <SalesOrderItemTable
          items={salesOrder.items.map((item) => ({
            ...item,
            baseUomId: item.product.uom.id,
            basePrice: item.product.price,
          }))}
          bordered={false}
          productsPath={productsPath}
        />
      </DetailSection>
      <DetailSection
        title={t("common.record.title")}
        defaultOpen={false}
        groupVariant="grid"
      >
        <Detail
          icon={FingerprintIcon}
          label={t("salesOrders.fields.id")}
          className="col-span-2"
        >
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">{salesOrder.id}</code>
            <CopyButton
              variant="ghost"
              size="xs"
              value={String(salesOrder.id)}
            />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={salesOrder.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {salesOrder.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={salesOrder.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {salesOrder.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
