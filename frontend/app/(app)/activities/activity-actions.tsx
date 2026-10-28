"use client";

import { EllipsisVerticalIcon, EyeIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ListedActivity } from "@/lib/activities";
import { DeleteActivityButton } from "./delete-activity-button";

/** Row actions of the activities table (DataTable `rowActions`). */
export function activityActions(activity: ListedActivity) {
  const href = `/activities/${encodeURIComponent(activity.id)}`;
  return (
    <>
      <DeleteActivityButton activity={activity} then="refresh" iconOnly />
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
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
