"use client";

import {
  CopyIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
  UserRoundIcon,
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
import { deleteCustomer, type ActionError } from "./actions";

/*
 * The actions of a customer, shared by the table's row menu
 * (customer-table-actions.tsx) and the detail page's
 * (customer-detail-actions.tsx). Each menu picks its items from
 * useCustomerActions and puts them in CustomerActionsMenu, so the two can
 * differ (other items, order, extra entries) while the confirmations stay
 * here.
 */

export type CustomerRef = { id: string; name: string; email: string | null };

/** After the action: back to the list, or refresh the page. */
type Then = "list" | "refresh";

/** Where the menu is: a row of the table, or the detail page. */
export type Placement = "table" | "detail";

/** A server action that asks for confirmation first. */
interface ConfirmedAction {
  label: string;
  icon: LucideIcon;
  /** Offered only when this says so (always when unset). */
  allowed?: (customer: CustomerRef) => boolean;
  title: (customer: CustomerRef) => string;
  description: string;
  run: (id: string) => Promise<ActionError | null>;
  destructive?: boolean;
  /** Where to go after it, in the table and on the detail page. */
  then: Record<Placement, Then>;
}

/** Add an action here to get its menu item and its confirmation. */
const CONFIRMED_ACTIONS = {
  delete: {
    label: "Delete",
    icon: Trash2Icon,
    title: (customer) => `Delete ${customer.name}?`,
    description: "The customer will no longer be listed or editable.",
    run: deleteCustomer,
    destructive: true,
    then: { table: "refresh", detail: "list" },
  },
} satisfies Record<string, ConfirmedAction>;

type ConfirmedActionName = keyof typeof CONFIRMED_ACTIONS;

/**
 * The menu items of a customer (null when not allowed), and `dialogs`: the
 * confirmation, to render outside the menu (which closes when an item is
 * clicked). `placement` picks
 * where each action goes after it (its `then`).
 */
export function useCustomerActions(
  customer: CustomerRef,
  { placement }: { placement: Placement },
) {
  const [confirming, setConfirming] = useState<ConfirmedActionName>();
  const href = `/customers/${encodeURIComponent(customer.id)}`;

  const confirmItem = (name: ConfirmedActionName) => {
    const action: ConfirmedAction = CONFIRMED_ACTIONS[name];
    if (action.allowed && !action.allowed(customer)) return null;
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
        <UserRoundIcon />
        View details
      </DropdownMenuItem>
    ),
    edit: (
      <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
        <PencilIcon />
        Edit
      </DropdownMenuItem>
    ),
    copyEmail: customer.email ? (
      <DropdownMenuItem
        onClick={() => navigator.clipboard.writeText(customer.email!)}
      >
        <CopyIcon />
        Copy email
      </DropdownMenuItem>
    ) : null,
    delete: confirmItem("delete"),
  };

  const dialogs = confirming && (
    <ConfirmDialog
      // A fresh dialog (no error left over) for each action.
      key={confirming}
      customer={customer}
      action={CONFIRMED_ACTIONS[confirming]}
      then={CONFIRMED_ACTIONS[confirming].then[placement]}
      onClose={() => setConfirming(undefined)}
    />
  );

  return { items, dialogs };
}

/** The ⋮ button and its menu: `children` are the items, `dialogs` go after it. */
export function CustomerActionsMenu({
  customer,
  variant,
  dialogs,
  children,
}: {
  customer: CustomerRef;
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
              aria-label={`Actions for ${customer.name}`}
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
  customer,
  action,
  then,
  onClose,
}: {
  customer: CustomerRef;
  action: ConfirmedAction;
  then: Then;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await action.run(customer.id);
      if (result) {
        setError(result.error);
        return;
      }
      onClose();
      if (then === "list") router.replace("/customers");
      else router.refresh();
    });

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action.title(customer)}</AlertDialogTitle>
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
