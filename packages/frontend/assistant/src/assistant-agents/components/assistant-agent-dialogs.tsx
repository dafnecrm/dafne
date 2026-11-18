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
import { deleteAssistantAgent } from "../actions.ts";
import type { AssistantAgentDetail } from "../types.ts";

/*
 * The confirmation dialogs of an assistant agent, shared by the table's row menu
 * (assistant-agent-table-actions.tsx) and the detail page's
 * (assistant-agent-detail-actions.tsx).
 */

export type AssistantAgentRef = Pick<AssistantAgentDetail, "id">;

/**
 * Confirms the deletion and runs it, then goes back to the list at `path`
 * (`then="list"`) or refreshes the current page (default).
 */
export function DeleteAssistantAgentDialog({
  assistantAgent,
  path,
  then = "refresh",
  onClose,
}: {
  assistantAgent: AssistantAgentRef;
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
      const result = await deleteAssistantAgent(assistantAgent.id);
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
              name: `${t("assistantAgents.singular")} ${assistantAgent.id}`,
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("assistantAgents.deleteDescription")}
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
