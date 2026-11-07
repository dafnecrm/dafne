"use client";

import { useTranslations } from "next-intl";
import {
  CircleOffIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import {
  CloseActivityDialog,
  DeleteActivityDialog,
  ReopenActivityDialog,
  type ActivityRef,
} from "./activity-dialogs";
import { ACTIVITY_STATUSES_ALLOW_CLOSE, ACTIVITY_STATUSES_ALLOW_EDIT, ACTIVITY_STATUSES_ALLOW_REOPEN } from "../activity-status-options";

/** Actions on the activity's page, in a menu. */
export function ActivityDetailActions({ activity }: { activity: ActivityRef }) {
  const [dialog, setDialog] = useState<"reopen" | "close" | "delete">();
  const t = useTranslations();
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
              aria-label={t("common.actionsFor", { name: activity.name })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {ACTIVITY_STATUSES_ALLOW_EDIT.includes(activity.status) && (
            <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
              <PencilIcon />
              {t("common.edit")}
            </DropdownMenuItem>
          )}
          {ACTIVITY_STATUSES_ALLOW_REOPEN.includes(activity.status) && (
            <DropdownMenuItem onClick={() => setDialog("reopen")}>
              <RotateCcwIcon />
              {t("activities.reopen")}
            </DropdownMenuItem>
          )}
          {ACTIVITY_STATUSES_ALLOW_CLOSE.includes(activity.status) && (
            <DropdownMenuItem onClick={() => setDialog("close")}>
              <CircleOffIcon />
              {t("activities.close")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDialog("delete")}
          >
            <Trash2Icon />
            {t("common.delete")}
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
