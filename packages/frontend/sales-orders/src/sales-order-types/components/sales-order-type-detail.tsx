import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
  ToggleLeftIcon,
  CircleAlertIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { SalesOrderTypeDetail } from "../types.ts";
import { Alert, AlertDescription, AlertTitle } from "@dafne/frontend-ui/components/alert";

/** The details of a sales order type: its fields, then who created and updated it. */
export function SalesOrderTypeDetails({
  salesOrderType,
}: {
  salesOrderType: SalesOrderTypeDetail;
}) {
  const t = useTranslations();
  return (
    <>
      {!salesOrderType.active && <Alert>
        <CircleAlertIcon />
        <AlertTitle>{t('salesOrderTypes.inactiveAlert.title')}</AlertTitle>
        <AlertDescription>{t('salesOrderTypes.inactiveAlert.description')}</AlertDescription>
      </Alert>}
      <DetailSection title={t("salesOrderTypes.sections.details")} groupVariant="grid">
        <Detail icon={TextIcon} label={t("salesOrderTypes.fields.description")}>
          {salesOrderType.description}
        </Detail>
        <Detail
          icon={ToggleLeftIcon}
          label={t("salesOrderTypes.fields.active")}
        >
          {salesOrderType.active === null
            ? "—"
            : t(salesOrderType.active ? "common.yes" : "common.no")}
        </Detail>
      </DetailSection>
      <DetailSection title={t("common.record.title")} groupVariant="grid" defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("salesOrderTypes.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">
              {salesOrderType.id}
            </code>
            <CopyButton variant="ghost" size="xs" value={String(salesOrderType.id)} />
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
