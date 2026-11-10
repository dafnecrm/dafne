"use client";

import { useTranslations } from "next-intl";
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
} from "@dafne/frontend-ui/components/alert-dialog";
import { Spinner } from "@dafne/frontend-ui/components/spinner";
import {
  closeActivity,
  deleteActivity,
  reopenActivity,
  type ActionError,
} from "../actions";
import { ActivityDetail } from "../types";

/*
 * The confirmation dialogs of an activity, shared by the table's row menu
 * (activity-table-actions.tsx) and the detail page's
 * (activity-detail-actions.tsx), with the status rules they follow.
 */

type ActivityStatus = ActivityDetail["status"];

export type ActivityRef = { id: number; name: string; status: ActivityStatus };

interface DialogProps {
  activity: ActivityRef;
  /** After the action: back to the list, or refresh the page (default). */
  then?: "list" | "refresh";
  onClose: () => void;
}

export function ReopenActivityDialog(props: DialogProps) {
  const t = useTranslations();
  return (
    <ConfirmDialog
      {...props}
      title={t("activities.reopenTitle", { name: props.activity.name })}
      description={t("activities.reopenDescription")}
      label={t("activities.reopen")}
      run={reopenActivity}
    />
  );
}

export function CloseActivityDialog(props: DialogProps) {
  const t = useTranslations();
  return (
    <ConfirmDialog
      {...props}
      title={t("activities.closeTitle", { name: props.activity.name })}
      description={t("activities.closeDescription")}
      label={t("activities.close")}
      run={closeActivity}
    />
  );
}

export function DeleteActivityDialog(props: DialogProps) {
  const t = useTranslations();
  return (
    <ConfirmDialog
      {...props}
      title={t("common.deleteTitle", { name: props.activity.name })}
      description={t("activities.deleteDescription")}
      label={t("common.delete")}
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
  run: (id: number) => Promise<ActionError | null>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await run(activity.id);
      if (result) {
        setError(result.error);
        return;
      }
      onClose();
      if (then === "list") {
        router.replace("/activities");
      } else {
        router.refresh();
      }
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
          <AlertDialogCancel disabled={pending}>
            {t("common.cancel")}
          </AlertDialogCancel>
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
