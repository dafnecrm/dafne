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
  LinkIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { SalesOrderDetail } from "../types.ts";
import { TextEditorContent } from "@dafne/frontend-ui/components/text-editor";
import Link from "next/link";
import { SalesOrderItemTable } from "./sales-order-items-table.tsx";
import { SALES_ORDER_STATUS_OPTIONS } from "../sales-orders-table.ts";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";

/** @dafne-ignore: customerId, typeId */

/**
 * The details of a sales order: its fields, then who created and updated it.
 * The customer links to `<customersPath>/<id>`, the app's customer page.
 */
export function SalesOrderDetails({
  salesOrder,
  path,
  customersPath,
}: {
  salesOrder: SalesOrderDetail;
  /** The app's sales orders list, e.g. "/sales-orders". */
  path: string;
  customersPath: string;
}) {
  const t = useTranslations();
  const optionLabel = useOptionLabel();
  return (
    <>
      <DetailSection title={t("salesOrders.sections.details")}>
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
          {optionLabel(SALES_ORDER_STATUS_OPTIONS, salesOrder.status)}
        </Detail>
        <Detail icon={TextIcon} label={t("salesOrders.fields.notes")} wide>
          {salesOrder.notes ? (
            <TextEditorContent
              html={salesOrder.notes}
              className="font-normal"
            />
          ) : (
            "—"
          )}
        </Detail>
      </DetailSection>
      <DetailSection
        title={t("salesOrders.sections.items")}
        groupClassName="flex"
      >
        <SalesOrderItemTable
          salesOrderId={salesOrder.id}
          items={salesOrder.items}
          path={path}
        />
      </DetailSection>
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("salesOrders.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">{salesOrder.id}</code>
            {/* <CopyButton variant="ghost" value={String(salesOrder.id)} /> */}
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
