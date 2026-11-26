"use client";

import { useTranslations } from "next-intl";
import {
  ChangelogSheet,
  type ChangeFieldConfig,
} from "@dafne/frontend-changelog/components/changelog-drawer";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import { ACTIVITY_STATUS_OPTIONS } from "../activity-status-options.ts";
import { ACTIVITY_TYPE_OPTIONS } from "../activity-type-options.ts";
import type { ActivityDetail } from "../types.ts";
import { getActivityChanges } from "../actions.ts";

/**
 * The activity's change log, in a sheet (opened from its actions menu).
 * `fields` names the logged fields; a field's `value` or `summary` shows it
 * otherwise (e.g. a record's name for its id: ResolvedName, in
 * @dafne/frontend-changelog/components/change-values).
 */
export function ActivityChangelogSheet({
  activityId,
  open,
  onOpenChange,
}: {
  activityId: ActivityDetail["id"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const optionLabel = useOptionLabel();
  const fields: Record<string, ChangeFieldConfig> = {
    name: { label: t("activities.fields.name") },
    type: {
      label: t("activities.fields.type"),
      value: (value) => optionLabel(ACTIVITY_TYPE_OPTIONS, value as string | null),
    },
    dueDate: { label: t("activities.fields.dueDate") },
    notes: { label: t("activities.fields.notes") },
    // Logged by the state machine, on each close and reopen.
    status: {
      label: t("activities.fields.status"),
      value: (value) => optionLabel(ACTIVITY_STATUS_OPTIONS, value as string | null),
    },
  };

  return (
    <ChangelogSheet
      open={open}
      onOpenChange={onOpenChange}
      load={(query) => getActivityChanges(activityId, query)}
      fields={fields}
    />
  );
}
