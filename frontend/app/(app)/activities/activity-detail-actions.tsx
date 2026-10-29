"use client";

import {
  CircleCheckIcon,
  EllipsisVerticalIcon,
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

/** Actions on the activity's page, in a menu; deleting goes back to the list. */
export function ActivityDetailActions({ activity }: { activity: ActivityRef }) {
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
  const href = `/activities/${encodeURIComponent(activity.id)}`;

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
        then="list"
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
