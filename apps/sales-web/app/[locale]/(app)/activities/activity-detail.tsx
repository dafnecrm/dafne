import { useOptionLabel } from "@/i18n/options";
import { useTranslations } from "next-intl";
import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  TagIcon,
  UserPenIcon,
  UserPlusIcon,
  CalendarClockIcon,
  LinkIcon,
  TextIcon,
} from "lucide-react";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { TextEditorContent } from "@dafne/frontend-ui/components/text-editor";
import type { ActivityDetail } from "@/lib/activities";
import {
  ACTIVITY_TYPE_OPTIONS,
  ACTIVITY_STATUS_OPTIONS,
} from "@/lib/activities-table";

/** The details of an activity: its fields, then who created and updated it. */
export function ActivityDetails({ activity }: { activity: ActivityDetail }) {
  const t = useTranslations();
  const optionLabel = useOptionLabel();
  return (
    <>
      <DetailSection title={t("activities.sections.details")}>
        <Detail icon={TagIcon} label={t("activities.fields.type")}>
          {optionLabel(ACTIVITY_TYPE_OPTIONS, activity.type)}
        </Detail>
        <Detail
          icon={CalendarClockIcon}
          label={t("activities.fields.completedAt")}
        >
          {activity.completedAt ? (
            <LocalDate value={activity.completedAt} format="dateTime" />
          ) : (
            "—"
          )}
        </Detail>
        <Detail icon={TagIcon} label={t("activities.fields.status")}>
          {optionLabel(ACTIVITY_STATUS_OPTIONS, activity.status)}
        </Detail>
        <Detail icon={LinkIcon} label={t("activities.fields.completedBy")}>
          {activity.completedById ? (
            <code className="font-mono text-xs">{activity.completedById}</code>
          ) : (
            "—"
          )}
        </Detail>
        <Detail icon={TextIcon} label={t("activities.fields.notes")} wide>
          {activity.notes ? (
            <TextEditorContent html={activity.notes} className="font-normal" />
          ) : (
            "—"
          )}
        </Detail>
        <Detail icon={CalendarClockIcon} label={t("activities.fields.dueDate")}>
          {activity.dueDate ? (
            <LocalDate value={activity.dueDate} format="dateTime" />
          ) : (
            "—"
          )}
        </Detail>
      </DetailSection>
      <DetailSection title={t("common.record.title")}>
        <Detail icon={FingerprintIcon} label={t("activities.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-xs">{activity.id}</code>
            <CopyButton variant="ghost" value={String(activity.id)} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={activity.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {activity.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={activity.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {activity.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
