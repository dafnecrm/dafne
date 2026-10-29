"use client";

import {
  CircleOffIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  LoaderCircleIcon,
  PencilIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { ActivityDetail } from "@/lib/activities";
import {
  closeActivity,
  deleteActivity,
  reopenActivity,
  type ActionError,
} from "./actions";

/*
 * The actions of an activity, shared by the table's row menu
 * (activity-table-actions.tsx) and the detail page's
 * (activity-detail-actions.tsx). Each menu picks its items from
 * useActivityActions and puts them in an ActivityActionsMenu, so the two can
 * differ (other items, order, extra entries) while the confirmations and the
 * status rules stay here.
 */

type ActivityStatus = ActivityDetail["status"];

export type ActivityRef = { id: string; name: string; status: ActivityStatus };

/** Statuses an activity can be edited, closed or set in progress from. */
export const ACTIVITY_STATUSES_ALLOW_EDIT: ActivityStatus[] = [
  "open",
  "in_progress",
];
export const ACTIVITY_STATUSES_ALLOW_CLOSE: ActivityStatus[] = ["in_progress"];
export const ACTIVITY_STATUSES_ALLOW_INPROGRESS: ActivityStatus[] = [
  "open",
  "closed",
];

/** After the action: back to the list, or refresh the page. */
type Then = "list" | "refresh";

/** Where the menu is: a row of the table, or the detail page. */
export type Placement = "table" | "detail";

/** A server action that asks for confirmation first. */
interface ConfirmedAction {
  label: string;
  icon: LucideIcon;
  /** Offered only for these statuses (always when unset). */
  statuses?: ActivityStatus[];
  title: (activity: ActivityRef) => string;
  description: string;
  run: (id: string) => Promise<ActionError | null>;
  destructive?: boolean;
  /** Where to go after it, in the table and on the detail page. */
  then: Record<Placement, Then>;
}

const CONFIRMED_ACTIONS = {
  setInProgress: {
    label: "Set in progress",
    icon: LoaderCircleIcon,
    statuses: ACTIVITY_STATUSES_ALLOW_INPROGRESS,
    title: (a) => `Set ${a.name} in progress?`,
    description: "The activity will be set in progress.",
    run: reopenActivity,
    destructive: true,
    then: { table: "refresh", detail: "refresh" },
  },
  close: {
    label: "Close",
    icon: CircleOffIcon,
    statuses: ACTIVITY_STATUSES_ALLOW_CLOSE,
    title: (a) => `Close ${a.name}?`,
    description: "The activity will no longer be editable.",
    run: closeActivity,
    destructive: true,
    then: { table: "refresh", detail: "refresh" },
  },
  delete: {
    label: "Delete",
    icon: Trash2Icon,
    title: (a) => `Delete ${a.name}?`,
    description: "The activity will no longer be listed or editable.",
    run: deleteActivity,
    destructive: true,
    then: { table: "refresh", detail: "list" },
  },
} satisfies Record<string, ConfirmedAction>;

type ConfirmedActionName = keyof typeof CONFIRMED_ACTIONS;

/**
 * The menu items of an activity, each null when its status doesn't allow
 * it, and `dialogs`: the confirmation, to render outside the menu (which
 * closes when an item is clicked). `placement` picks
 * where each action goes after it (its `then`).
 */
export function useActivityActions(
  activity: ActivityRef,
  { placement }: { placement: Placement },
) {
  const [confirming, setConfirming] = useState<ConfirmedActionName>();
  const href = `/activities/${encodeURIComponent(activity.id)}`;

  const confirmItem = (name: ConfirmedActionName) => {
    const action: ConfirmedAction = CONFIRMED_ACTIONS[name];
    if (action.statuses && !action.statuses.includes(activity.status))
      return null;
    const Icon = action.icon;
    return (
      <DropdownMenuItem
        variant={name === "delete" ? "destructive" : "default"}
        onClick={() => setConfirming(name)}
      >
        <Icon />
        {action.label}
      </DropdownMenuItem>
    );
  };

  const items = {
    view: (
      <DropdownMenuItem render={<Link href={href} />}>
        <EyeIcon />
        View details
      </DropdownMenuItem>
    ),
    edit: ACTIVITY_STATUSES_ALLOW_EDIT.includes(activity.status) ? (
      <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
        <PencilIcon />
        Edit
      </DropdownMenuItem>
    ) : null,
    setInProgress: confirmItem("setInProgress"),
    close: confirmItem("close"),
    delete: confirmItem("delete"),
  };

  const dialogs = confirming && (
    <ConfirmDialog
      // A fresh dialog (no error left over) for each action.
      key={confirming}
      activity={activity}
      action={CONFIRMED_ACTIONS[confirming]}
      then={CONFIRMED_ACTIONS[confirming].then[placement]}
      onClose={() => setConfirming(undefined)}
    />
  );

  return { items, dialogs };
}

/** The ⋮ button and its menu: `children` are the items, `dialogs` go after it. */
export function ActivityActionsMenu({
  activity,
  variant,
  dialogs,
  children,
}: {
  activity: ActivityRef;
  variant: "ghost" | "outline";
  dialogs: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant={variant}
              size="icon-sm"
              aria-label={`Actions for ${activity.name}`}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{children}</DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
}

/**
 * Confirms an action and runs it, then goes back to the list
 * (`then="list"`) or refreshes the current page (`then="refresh"`).
 */
function ConfirmDialog({
  activity,
  action,
  then,
  onClose,
}: {
  activity: ActivityRef;
  action: ConfirmedAction;
  then: Then;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await action.run(activity.id);
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
          <AlertDialogTitle>{action.title(activity)}</AlertDialogTitle>
          <AlertDialogDescription>{action.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={action.destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={confirm}
          >
            {pending && <Spinner data-icon="inline-start" />}
            {action.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
