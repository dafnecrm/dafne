import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  TagIcon,
  UserPenIcon,
  UserPlusIcon,
} from "lucide-react";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import type { ActivityDetail } from "@/lib/activities";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/activities-table";

/** The details of an activity: its fields, then who created and updated it. */
export function ActivityDetails({ activity }: { activity: ActivityDetail }) {
  return (
    <>
      <DetailSection title="Details">
        <Detail icon={TagIcon} label="Type">
          {ACTIVITY_TYPE_OPTIONS.find((o) => o.value === activity.type)
            ?.label ?? "—"}
        </Detail>
      </DetailSection>
      <DetailSection title="Record">
        <Detail icon={FingerprintIcon} label="Activity ID">
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-xs">{activity.id}</code>
            <CopyButton variant="ghost" value={activity.id} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label="Created">
          <LocalDate value={activity.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label="Created by">
          {activity.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label="Updated">
          <LocalDate value={activity.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label="Updated by">
          {activity.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
