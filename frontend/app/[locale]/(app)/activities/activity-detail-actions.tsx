"use client";

import {
  CircleOffIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ACTIVITY_STATUSES_ALLOW_CLOSE,
  ACTIVITY_STATUSES_ALLOW_EDIT,
  ACTIVITY_STATUSES_ALLOW_REOPEN,
  CloseActivityDialog,
  DeleteActivityDialog,
  ReopenActivityDialog,
  type ActivityRef,
} from "./activity-dialogs";

/** Actions on the activity's page, in a menu. */
export function ActivityDetailActions({ activity }: { activity: ActivityRef }) {
  const [dialog, setDialog] = useState<"reopen" | "close" | "delete">();
  const href = `/activities/${encodeURIComponent(activity.id)}`;
  const closeDialog = () => setDialog(undefined);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`Actions for ${activity.name}`}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {ACTIVITY_STATUSES_ALLOW_EDIT.includes(activity.status) && (
            <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
          )}
          {ACTIVITY_STATUSES_ALLOW_REOPEN.includes(activity.status) && (
            <DropdownMenuItem onClick={() => setDialog("reopen")}>
              <RotateCcwIcon />
              Reopen
            </DropdownMenuItem>
          )}
          {ACTIVITY_STATUSES_ALLOW_CLOSE.includes(activity.status) && (
            <DropdownMenuItem onClick={() => setDialog("close")}>
              <CircleOffIcon />
              Close
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDialog("delete")}
          >
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which closes when an item is clicked. */}
      {dialog === "reopen" && (
        <ReopenActivityDialog activity={activity} onClose={closeDialog} />
      )}
      {dialog === "close" && (
        <CloseActivityDialog activity={activity} onClose={closeDialog} />
      )}
      {dialog === "delete" && (
        <DeleteActivityDialog
          activity={activity}
          then="list"
          onClose={closeDialog}
        />
      )}
    </>
  );
}
