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
import type { ActivityDetail } from "@/lib/activities";
import {
  closeActivity,
  deleteActivity,
  reopenActivity,
  type ActionError,
} from "./actions";

/*
 * The confirmation dialogs of an activity, shared by the table's row menu
 * (activity-table-actions.tsx) and the detail page's
 * (activity-detail-actions.tsx), with the status rules they follow.
 */

type ActivityStatus = ActivityDetail["status"];

export type ActivityRef = { id: string; name: string; status: ActivityStatus };

/** Statuses an activity can be edited, closed or reopened from. */
export const ACTIVITY_STATUSES_ALLOW_EDIT: ActivityStatus[] = ["open"];
export const ACTIVITY_STATUSES_ALLOW_CLOSE: ActivityStatus[] = ["open"];
export const ACTIVITY_STATUSES_ALLOW_REOPEN: ActivityStatus[] = ["closed"];

interface DialogProps {
  activity: ActivityRef;
  /** After the action: back to the list, or refresh the page (default). */
  then?: "list" | "refresh";
  onClose: () => void;
}

export function ReopenActivityDialog(props: DialogProps) {
  return (
    <ConfirmDialog
      {...props}
      title={`Reopen ${props.activity.name}?`}
      description="The activity will be open and editable again."
      label="Reopen"
      run={reopenActivity}
    />
  );
}

export function CloseActivityDialog(props: DialogProps) {
  return (
    <ConfirmDialog
      {...props}
      title={`Close ${props.activity.name}?`}
      description="The activity will no longer be editable."
      label="Close"
      run={closeActivity}
    />
  );
}

export function DeleteActivityDialog(props: DialogProps) {
  return (
    <ConfirmDialog
      {...props}
      title={`Delete ${props.activity.name}?`}
      description="The activity will no longer be listed or editable."
      label="Delete"
      run={deleteActivity}
    />
  );
}

/** Confirms a server action and runs it, then goes where `then` says. */
function ConfirmDialog({
  activity,
  then = "refresh",
  onClose,
  title,
  description,
  label,
  run,
}: DialogProps & {
  title: string;
  description: string;
  label: string;
  run: (id: string) => Promise<ActionError | null>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await run(activity.id);
      if (result) {
        setError(result.error);
        return;
      }
      onClose();
      if (then === "list") router.replace("/activities");
      else router.refresh();
    });

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
