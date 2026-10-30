"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { activityHref } from "@/lib/tasks-table";
import { deleteTask } from "./actions";

/*
 * The confirmation dialogs of a task, shared by the table's row menu
 * (task-table-actions.tsx) and the detail page's
 * (task-detail-actions.tsx).
 */

export type TaskRef = { id: string; name: string; activityId: string };

/**
 * Confirms the deletion and runs it, then goes back to the task's activity
 * (`then="list"`: tasks are listed there) or refreshes the current page
 * (default).
 */
export function DeleteTaskDialog({
  task,
  then = "refresh",
  onClose,
}: {
  task: TaskRef;
  then?: "list" | "refresh";
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result) {
        setError(result.error);
        return;
      }
      onClose();
      if (then === "list") router.replace(activityHref(task.activityId));
      else router.refresh();
    });

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {task.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The task will no longer be listed or editable.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={confirm}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
