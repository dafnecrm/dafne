import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { SalesOrderTypeDetail } from "../types.ts";

/** The details of a sales order type: its fields, then who created and updated it. */
export function SalesOrderTypeDetails({
  salesOrderType,
}: {
  salesOrderType: SalesOrderTypeDetail;
}) {
  const t = useTranslations();
  return (
    <>
      <DetailSection title={t("salesOrderTypes.sections.details")}>
        <Detail icon={TextIcon} label={t("salesOrderTypes.fields.description")}>
          {salesOrderType.description}
        </Detail>
      </DetailSection>
      <DetailSection title={t("common.record.title")}>
        <Detail icon={FingerprintIcon} label={t("salesOrderTypes.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-xs">
              {salesOrderType.id}
            </code>
            <CopyButton variant="ghost" value={String(salesOrderType.id)} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={salesOrderType.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {salesOrderType.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={salesOrderType.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {salesOrderType.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
