"use client";

import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  ActivityActionsMenu,
  useActivityActions,
  type ActivityRef,
} from "./activity-actions";

/** Actions of a row of the activities table, in a menu. */
export function ActivityTableActions({ activity }: { activity: ActivityRef }) {
  const { items, dialogs } = useActivityActions(activity, {
    placement: "table",
  });

  return (
    <ActivityActionsMenu activity={activity} variant="ghost" dialogs={dialogs}>
      {items.view}
      {items.edit}
      <DropdownMenuSeparator />
      {items.delete}
    </ActivityActionsMenu>
  );
}
