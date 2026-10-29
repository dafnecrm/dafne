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
import { closeActivity, deleteActivity } from "./actions";

/*
 * The confirmations of the activity actions, shared by the table's row menu
 * (activity-table-actions.tsx) and the detail page's (activity-detail-actions.tsx).
 */

export type ActivityRef = { id: string; name: string };

/**
 * Confirms and deletes an activity, then goes back to the list
 * (`then="list"`) or refreshes the current page (`then="refresh"`).
 */
export function DeleteActivityDialog({
  activity,
  then,
  open,
  onOpenChange,
}: {
  activity: ActivityRef;
  then: "list" | "refresh";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteActivity(activity.id);
      if (result) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      if (then === "list") router.replace("/activities");
      else router.refresh();
    });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setError(undefined);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {activity.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The activity will no longer be listed or editable.
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

/**
 * Confirms and closes an activity, then goes back to the list
 * (`then="list"`) or refreshes the current page (`then="refresh"`).
 */
export function CloseActivityDialog({
  activity,
  then,
  open,
  onOpenChange,
}: {
  activity: ActivityRef;
  then: "list" | "refresh";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await closeActivity(activity.id);
      if (result) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      if (then === "list") router.replace("/activities");
      else router.refresh();
    });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setError(undefined);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close {activity.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The activity will no longer be editable.
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
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
