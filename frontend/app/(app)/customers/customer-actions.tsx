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
import { deleteCustomer } from "./actions";

/*
 * The confirmations of the customer actions, shared by the table's row menu
 * (customer-table-actions.tsx) and the detail page's (customer-detail-actions.tsx).
 */

export type CustomerRef = { id: string; name: string; email: string | null };

/**
 * Confirms and deletes a customer, then goes back to the list
 * (`then="list"`) or refreshes the current page (`then="refresh"`).
 */
export function DeleteCustomerDialog({
  customer,
  then,
  open,
  onOpenChange,
}: {
  customer: CustomerRef;
  then: "list" | "refresh";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteCustomer(customer.id);
      if (result) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      if (then === "list") router.replace("/customers");
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
          <AlertDialogTitle>Delete {customer.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The customer will no longer be listed or editable.
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
