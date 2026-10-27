"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { deleteCustomer } from "./actions";

/**
 * Delete button that asks for confirmation in a popover. After deleting,
 * goes back to the list (`then="list"`) or refreshes the current one
 * (`then="refresh"`). `iconOnly` fits a table row.
 */
export function DeleteCustomerButton({
  customer,
  then,
  iconOnly,
}: {
  customer: { id: string; name: string };
  then: "list" | "refresh";
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteCustomer(customer.id);
      if (result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (then === "list") router.replace("/customers");
      else router.refresh();
    });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(undefined);
      }}
    >
      <PopoverTrigger
        render={
          iconOnly ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${customer.name}`}
            />
          ) : (
            <Button variant="destructive" size="sm" />
          )
        }
      >
        <Trash2Icon data-icon={iconOnly ? undefined : "inline-start"} />
        {!iconOnly && "Delete"}
      </PopoverTrigger>
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>Delete {customer.name}?</PopoverTitle>
          <PopoverDescription>
            The customer will no longer be listed or editable.
          </PopoverDescription>
        </PopoverHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={confirm}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
