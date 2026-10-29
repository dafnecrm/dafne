"use client";

import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  ActivityActionsMenu,
  useActivityActions,
  type ActivityRef,
} from "./activity-actions";

/** Actions on the activity's page, in a menu. */
export function ActivityDetailActions({ activity }: { activity: ActivityRef }) {
  const { items, dialogs } = useActivityActions(activity, {
    placement: "detail",
  });

  return (
    <ActivityActionsMenu
      activity={activity}
      variant="outline"
      dialogs={dialogs}
    >
      {items.edit}
      {items.setInProgress}
      {items.close}
      <DropdownMenuSeparator />
      {items.delete}
    </ActivityActionsMenu>
  );
}
