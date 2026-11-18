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
import { deleteAssistantProvider } from "../actions.ts";
import type { AssistantProviderDetail } from "../types.ts";

/*
 * The confirmation dialogs of an assistant provider, shared by the table's row menu
 * (assistant-provider-table-actions.tsx) and the detail page's
 * (assistant-provider-detail-actions.tsx).
 */

export type AssistantProviderRef = Pick<AssistantProviderDetail, "id">;

/**
 * Confirms the deletion and runs it, then goes back to the list at `path`
 * (`then="list"`) or refreshes the current page (default).
 */
export function DeleteAssistantProviderDialog({
  assistantProvider,
  path,
  then = "refresh",
  onClose,
}: {
  assistantProvider: AssistantProviderRef;
  path: string;
  then?: "list" | "refresh";
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteAssistantProvider(assistantProvider.id);
      if (result) {
        setError(result.error);
        return;
      }
      onClose();
      if (then === "list") {
        router.replace(path);
      } else {
        router.refresh();
      }
    });

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("common.deleteTitle", {
              name: `${t("assistantProviders.singular")} ${assistantProvider.id}`,
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("assistantProviders.deleteDescription")}
          </AlertDialogDescription>
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
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
