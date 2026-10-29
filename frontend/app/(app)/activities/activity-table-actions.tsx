"use client";

import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
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
  ACTIVITY_STATUSES_ALLOW_EDIT,
  DeleteActivityDialog,
  type ActivityRef,
} from "./activity-dialogs";

/** Actions of a row of the activities table, in a menu. */
export function ActivityTableActions({ activity }: { activity: ActivityRef }) {
  const [deleting, setDeleting] = useState(false);
  const href = `/activities/${encodeURIComponent(activity.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${activity.name}`}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={href} />}>
            <EyeIcon />
            View details
          </DropdownMenuItem>
          {ACTIVITY_STATUSES_ALLOW_EDIT.includes(activity.status) && (
            <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2Icon />
            Delete
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
