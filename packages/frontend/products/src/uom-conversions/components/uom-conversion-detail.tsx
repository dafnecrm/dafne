import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  LinkIcon,
  HashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { UomConversionDetail } from "../types.ts";

/** The details of an uom conversion: its fields, then who created and updated it. */
export function UomConversionDetails({
  uomConversion,
}: {
  uomConversion: UomConversionDetail;
}) {
  const t = useTranslations();
  return (
    <>
      <DetailSection
        title={t("uomConversions.sections.details")}
        groupVariant="grid"
      >
        <Detail icon={LinkIcon} label={t("uomConversions.fields.fromUomId")}>
          {uomConversion.from.id} · {uomConversion.from.name}
        </Detail>
        <Detail icon={LinkIcon} label={t("uomConversions.fields.toUomId")}>
          {uomConversion.to.id} · {uomConversion.to.name}
        </Detail>
        <Detail icon={HashIcon} label={t("uomConversions.fields.factor")}>
          {t("uomConversions.fields.equals", {
            from: uomConversion.fromUomId,
            to: uomConversion.toUomId,
            factor: uomConversion.factor,
          })}
        </Detail>
      </DetailSection>
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("uomConversions.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">
              {uomConversion.id}
            </code>
            <CopyButton
              variant="ghost"
              size="xs"
              value={String(uomConversion.id)}
            />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={uomConversion.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {uomConversion.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={uomConversion.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {uomConversion.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
