import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
  TagIcon,
  ToggleLeftIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { AssistantProviderDetail } from "../types.ts";
import { ASSISTANT_PROVIDER_KIND_OPTIONS } from "../assistant-providers-table.ts";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";

/** The details of an assistant provider: its fields, then who created and updated it. */
export function AssistantProviderDetails({
  assistantProvider,
}: {
  assistantProvider: AssistantProviderDetail;
}) {
  const t = useTranslations();
  const optionLabel = useOptionLabel();
  return (
    <>
      <DetailSection
        title={t("assistantProviders.sections.details")}
        groupVariant="grid"
      >
        <Detail icon={TextIcon} label={t("assistantProviders.fields.name")}>
          {assistantProvider.name}
        </Detail>
        <Detail icon={TagIcon} label={t("assistantProviders.fields.kind")}>
          {optionLabel(ASSISTANT_PROVIDER_KIND_OPTIONS, assistantProvider.kind)}
        </Detail>
        <Detail icon={TextIcon} label={t("assistantProviders.fields.baseUrl")}>
          {assistantProvider.baseUrl ?? "—"}
        </Detail>
        <Detail
          icon={TextIcon}
          label={t("assistantProviders.fields.apiKeyEnv")}
        >
          {assistantProvider.apiKeyEnv ?? "—"}
        </Detail>
        <Detail
          icon={ToggleLeftIcon}
          label={t("assistantProviders.fields.enabled")}
        >
          {t(assistantProvider.enabled ? "common.yes" : "common.no")}
        </Detail>
      </DetailSection>
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail
          icon={FingerprintIcon}
          label={t("assistantProviders.fields.id")}
        >
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">
              {assistantProvider.id}
            </code>
            <CopyButton
              variant="ghost"
              size="xs"
              value={String(assistantProvider.id)}
            />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={assistantProvider.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {assistantProvider.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={assistantProvider.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {assistantProvider.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
