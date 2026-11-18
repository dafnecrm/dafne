import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
  LinkIcon,
  ToggleLeftIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { AssistantAgentDetail } from "../types.ts";

/** The details of an assistant agent: its fields, then who created and updated it. */
export function AssistantAgentDetails({
  assistantAgent,
}: {
  assistantAgent: AssistantAgentDetail;
}) {
  const t = useTranslations();
  return (
    <>
      <DetailSection
        title={t("assistantAgents.sections.details")}
        groupVariant="grid"
      >
        <Detail icon={TextIcon} label={t("assistantAgents.fields.name")}>
          {assistantAgent.name}
        </Detail>
        <Detail icon={TextIcon} label={t("assistantAgents.fields.description")}>
          {assistantAgent.description ?? "—"}
        </Detail>
        <Detail
          icon={TextIcon}
          label={t("assistantAgents.fields.systemPrompt")}
        >
          {assistantAgent.systemPrompt}
        </Detail>
        <Detail
          icon={LinkIcon}
          label={t("assistantAgents.fields.defaultModelId")}
        >
          {assistantAgent.defaultModelId ? (
            <code className="font-sans text-xs">
              {assistantAgent.defaultModelId}
            </code>
          ) : (
            "—"
          )}
        </Detail>
        <Detail
          icon={ToggleLeftIcon}
          label={t("assistantAgents.fields.allowModelOverride")}
        >
          {t(assistantAgent.allowModelOverride ? "common.yes" : "common.no")}
        </Detail>
        <Detail
          icon={ToggleLeftIcon}
          label={t("assistantAgents.fields.enabled")}
        >
          {t(assistantAgent.enabled ? "common.yes" : "common.no")}
        </Detail>
        <Detail icon={UsersIcon} label={t("assistantAgents.fields.audience")}>
          {assistantAgent.audience === "everyone"
            ? t("assistantAgents.audience.everyone")
            : assistantAgent.groups.map((group) => group.name).join(", ") || "—"}
        </Detail>
      </DetailSection>
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("assistantAgents.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">
              {assistantAgent.id}
            </code>
            <CopyButton
              variant="ghost"
              size="xs"
              value={String(assistantAgent.id)}
            />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={assistantAgent.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {assistantAgent.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={assistantAgent.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {assistantAgent.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
