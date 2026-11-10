"use client";

import { useTranslations } from "next-intl";
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
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
  DeleteActivityDialog,
  type ActivityRef,
} from "./activity-dialogs";
import { ACTIVITY_STATUSES_ALLOW_EDIT } from "../activity-status-options";

/** Actions of a row of the activities table, in a menu. */
export function ActivityTableActions({ 
  activity, 
  path
}: {
  activity: ActivityRef,
  /** Path of the app's activities list. */
  path: string
}) {

  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("common");
  const href = `/${path}/${encodeURIComponent(activity.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("actionsFor", { name: activity.name })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={href} />}>
            <EyeIcon />
            {t("viewDetails")}
          </DropdownMenuItem>
          {ACTIVITY_STATUSES_ALLOW_EDIT.includes(activity.status) && (
            <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
              <PencilIcon />
              {t("edit")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2Icon />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which closes when an item is clicked. */}
      {deleting && (
        <DeleteActivityDialog
          activity={activity}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
