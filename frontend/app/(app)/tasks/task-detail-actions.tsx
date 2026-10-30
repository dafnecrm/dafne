"use client";

import { EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
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
import { DeleteTaskDialog, type TaskRef } from "./task-dialogs";

/** Actions on the task's page, in a menu. */
export function TaskDetailActions({ task }: { task: TaskRef }) {
  const [deleting, setDeleting] = useState(false);
  const href = `/tasks/${encodeURIComponent(task.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`Actions for ${task.name}`}
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
        <DeleteTaskDialog
          task={task}
          then="list"
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
