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
import { deleteProduct } from "../actions.ts";

/*
 * The confirmation dialogs of a product, shared by the table's row menu
 * (product-table-actions.tsx) and the detail page's
 * (product-detail-actions.tsx).
 */

export type ProductRef = { id: number; name: string };

/**
 * Confirms the deletion and runs it, then goes back to the list at `path`
 * (`then="list"`) or refreshes the current page (default).
 */
export function DeleteProductDialog({
  product,
  path,
  then = "refresh",
  onClose,
}: {
  product: ProductRef;
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
      const result = await deleteProduct(product.id);
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
            {t("common.deleteTitle", { name: product.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("products.deleteDescription")}
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
