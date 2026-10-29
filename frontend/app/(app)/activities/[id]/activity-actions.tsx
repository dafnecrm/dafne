"use client";

import {
  CircleCheckIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { closeActivity, deleteActivity } from "../actions";

type ActivityRef = { id: string; name: string };

/**
 * Actions of an activity, in a menu: View details (in the table), Edit and
 * Delete. `placement="table"` fits a row and refreshes the list after
 * deleting; on the activity's page, deleting goes back to the list.
 */
export function ActivityActions({
  activity,
  placement = "page",
}: {
  activity: ActivityRef;
  placement?: "table" | "page";
}) {
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
  const href = `/activities/${encodeURIComponent(activity.id)}`;
  const inTable = placement === "table";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant={inTable ? "ghost" : "outline"}
              size="icon-sm"
              aria-label={`Actions for ${activity.name}`}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {inTable && (
            <DropdownMenuItem render={<Link href={href} />}>
              <EyeIcon />
              View details
            </DropdownMenuItem>
          )}
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
        then={inTable ? "refresh" : "list"}
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
