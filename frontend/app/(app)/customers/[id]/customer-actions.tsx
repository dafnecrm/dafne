"use client";

import {
  CopyIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
  UserRoundIcon,
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
import { deleteCustomer } from "../actions";

type CustomerRef = { id: string; name: string; email: string | null };

/**
 * Actions of a customer, in a menu: View details (in the table), Edit,
 * Copy email and Delete. `placement="table"` fits a row and refreshes the list after
 * deleting; on the customer's page, deleting goes back to the list.
 */
export function CustomerActions({
  customer,
  placement = "page",
}: {
  customer: CustomerRef;
  placement?: "table" | "page";
}) {
  const [deleting, setDeleting] = useState(false);
  const href = `/customers/${encodeURIComponent(customer.id)}`;
  const inTable = placement === "table";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant={inTable ? "ghost" : "outline"}
              size="icon-sm"
              aria-label={`Actions for ${customer.name}`}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {inTable && (
            <DropdownMenuItem render={<Link href={href} />}>
              <UserRoundIcon />
              View details
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          {customer.email && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(customer.email!)}
              >
                <CopyIcon />
                Copy email
              </DropdownMenuItem>
            </>
          )}
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
      <DeleteCustomerDialog
        customer={customer}
        then={inTable ? "refresh" : "list"}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </>
  );
}

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
