import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  LinkIcon,
  TextIcon,
  ToggleLeftIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { AssistantModelDetail } from "../types.ts";

/** The details of an assistant model: its fields, then who created and updated it. */
export function AssistantModelDetails({
  assistantModel,
}: {
  assistantModel: AssistantModelDetail;
}) {
  const t = useTranslations();
  return (
    <>
      <DetailSection
        title={t("assistantModels.sections.details")}
        groupVariant="grid"
      >
        <Detail icon={LinkIcon} label={t("assistantModels.fields.providerId")}>
          <code className="font-sans text-xs">{assistantModel.providerId}</code>
        </Detail>
        <Detail icon={LinkIcon} label={t("assistantModels.fields.modelId")}>
          <code className="font-sans text-xs">{assistantModel.modelId}</code>
        </Detail>
        <Detail icon={TextIcon} label={t("assistantModels.fields.label")}>
          {assistantModel.label}
        </Detail>
        <Detail
          icon={ToggleLeftIcon}
          label={t("assistantModels.fields.supportsTools")}
        >
          {t(assistantModel.supportsTools ? "common.yes" : "common.no")}
        </Detail>
        <Detail
          icon={ToggleLeftIcon}
          label={t("assistantModels.fields.enabled")}
        >
          {t(assistantModel.enabled ? "common.yes" : "common.no")}
        </Detail>
      </DetailSection>
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("assistantModels.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">
              {assistantModel.id}
            </code>
            <CopyButton
              variant="ghost"
              size="xs"
              value={String(assistantModel.id)}
            />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={assistantModel.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {assistantModel.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={assistantModel.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {assistantModel.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
