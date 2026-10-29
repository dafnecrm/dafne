"use client";

import { Trash2Icon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { deleteActivity } from "./actions";

type DeletedActivity = { id: string; name: string };

/**
 * Deletes an activity, then goes back to the list (`then="list"`) or
 * refreshes the current page (`then="refresh"`). `done` runs on success,
 * e.g. to close the confirmation.
 */
function useDeleteActivity(
  activity: DeletedActivity,
  then: "list" | "refresh",
) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = (done: () => void) =>
    startTransition(async () => {
      const result = await deleteActivity(activity.id);
      if (result) {
        setError(result.error);
        return;
      }
      done();
      if (then === "list") router.replace("/activities");
      else router.refresh();
    });

  return { error, pending, confirm, clearError: () => setError(undefined) };
}

const description = "The activity will no longer be listed or editable.";

/** Delete button that asks for confirmation in a popover (detail page). */
export function DeleteActivityButton({
  activity,
  then,
}: {
  activity: DeletedActivity;
  then: "list" | "refresh";
}) {
  const [open, setOpen] = useState(false);
  const { error, pending, confirm, clearError } = useDeleteActivity(
    activity,
    then,
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) clearError();
      }}
    >
      <PopoverTrigger render={<Button variant="destructive" size="sm" />}>
        <Trash2Icon data-icon="inline-start" />
        Delete
      </PopoverTrigger>
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>Delete {activity.name}?</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => confirm(() => setOpen(false))}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Confirmation for deleting from a menu (the table's row actions): the menu
 * item opens it, since a popover would close with the menu. Refreshes the
 * list after deleting.
 */
export function DeleteActivityDialog({
  activity,
  open,
  onOpenChange,
}: {
  activity: DeletedActivity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { error, pending, confirm, clearError } = useDeleteActivity(
    activity,
    "refresh",
  );

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) clearError();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {activity.name}?</AlertDialogTitle>
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
            onClick={() => confirm(() => onOpenChange(false))}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
