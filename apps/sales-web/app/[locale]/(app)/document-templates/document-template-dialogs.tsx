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
import type { DocumentTemplateDetail } from "@/lib/document-templates";
import { deleteDocumentTemplate } from "./actions";

/*
 * The confirmation dialogs of a document template, shared by the table's row menu
 * (document-template-table-actions.tsx) and the detail page's
 * (document-template-detail-actions.tsx).
 */

export type DocumentTemplateRef = Pick<DocumentTemplateDetail, "id">;

/**
 * Confirms the deletion and runs it, then goes back to the list
 * (`then="list"`) or refreshes the current page (default).
 */
export function DeleteDocumentTemplateDialog({
  documentTemplate,
  then = "refresh",
  onClose,
}: {
  documentTemplate: DocumentTemplateRef;
  then?: "list" | "refresh";
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteDocumentTemplate(documentTemplate.id);
      if (result) {
        setError(result.error);
        return;
      }
      onClose();
      if (then === "list") {
        router.replace("/document-templates");
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
              name: `${t("documentTemplates.singular")} ${documentTemplate.id}`,
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("documentTemplates.deleteDescription")}
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
