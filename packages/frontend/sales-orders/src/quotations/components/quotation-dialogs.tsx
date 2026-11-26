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
import { changeQuotationStatus, deleteQuotation } from "../actions.ts";
import type { QuotationDetail } from "../types.ts";

/*
 * The confirmation dialogs of a quotation, shared by the table's row menu
 * (quotation-table-actions.tsx) and the detail page's
 * (quotation-detail-actions.tsx).
 */

export type QuotationRef = Pick<QuotationDetail, "id"|"status">;

/**
 * Confirms the deletion and runs it, then goes back to the list at `path`
 * (`then="list"`) or refreshes the current page (default).
 */
export function DeleteQuotationDialog({
  quotation,
  path,
  then = "refresh",
  onClose,
}: {
  quotation: QuotationRef;
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
      const result = await deleteQuotation(quotation.id);
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
              name: `${t("quotations.singular")} ${quotation.id}`,
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("quotations.deleteDescription")}
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

/**
 * Confirms that the customer accepted the quotation, accepts it (the
 * backend creates its sales order, in draft) and opens that order, at
 * `<salesOrdersPath>/<id>`.
 */
export function AcceptQuotationDialog({
  quotation,
  salesOrdersPath,
  onClose,
}: {
  quotation: QuotationRef;
  salesOrdersPath: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await changeQuotationStatus(quotation.id, "accepted");
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onClose();
      if (result.salesOrder) {
        router.push(`${salesOrdersPath}/${encodeURIComponent(result.salesOrder.id)}`);
      } else {
        router.refresh();
      }
    });

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("quotations.accept.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("quotations.accept.description")}
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
          <AlertDialogAction disabled={pending} onClick={confirm}>
            {pending && <Spinner data-icon="inline-start" />}
            {t("quotations.accept.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
