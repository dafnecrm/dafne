import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  LinkIcon,
  TextIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { SalesOrderDetail } from "../types.ts";
import { TextEditorContent } from "@dafne/frontend-ui/components/text-editor";
import Link from "next/link";
import { SalesOrderItemTable } from "./sales-order-items-table.tsx";

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
  return (
    <>
      <DetailSection title={t("salesOrders.sections.details")}>
        <Detail icon={LinkIcon} label={t("salesOrders.fields.customer")}>
          <Link
            href={`${customersPath}/${encodeURIComponent(salesOrder.customer.id)}`}
            className="hover:underline"
          >
            {salesOrder.customer.name}
          </Link>
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
      <DetailSection title={t("common.record.title")}>
        <Detail icon={FingerprintIcon} label={t("salesOrders.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-xs">{salesOrder.id}</code>
            <CopyButton variant="ghost" value={String(salesOrder.id)} />
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
