"use client";

import {
  CircleCheckIcon,
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
  DeleteActivityDialog,
  CloseActivityDialog,
  type ActivityRef,
} from "./activity-actions";

/** Actions of a row of the activities table, in a menu; deleting refreshes the list. */
export function ActivityTableActions({ activity }: { activity: ActivityRef }) {
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
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
          <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setClosing(true)}>
            <CircleCheckIcon />
            Close
          </DropdownMenuItem>
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
      {/* Outside the menu, which closes when the item is clicked. */}
      <DeleteActivityDialog
        activity={activity}
        then="refresh"
        open={deleting}
        onOpenChange={setDeleting}
      />
      {/* Outside the menu, which closes when the item is clicked. */}
      <CloseActivityDialog
        activity={activity}
        then="refresh"
        open={closing}
        onOpenChange={setClosing}
      />
    </>
  );
}
