"use client";

import { useTranslations } from "next-intl";
import {
  CopyIcon,
  EllipsisVerticalIcon,
  HistoryIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import { DeleteCustomerDialog, type CustomerRef } from "./customer-dialogs.tsx";
import { CustomerChangelogSheet } from "./customer-changelog.tsx";

/**
 * Actions on the customer's page, in a menu: edit (`<path>/<id>/edit`) and
 * delete, then back to the list at `path`.
 */
export function CustomerDetailActions({
  customer,
  path,
}: {
  customer: CustomerRef;
  /** Path of the app's customers list. */
  path: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [history, setHistory] = useState(false);
  const t = useTranslations();
  const href = `${path}/${encodeURIComponent(customer.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("common.actionsFor", { name: customer.name })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
            <PencilIcon />
            {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setHistory(true)}>
            <HistoryIcon />
            {t("changelog.open")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2Icon />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which closes when an item is clicked. */}
      <CustomerChangelogSheet
        customerId={customer.id}
        open={history}
        onOpenChange={setHistory}
      />
      {deleting && (
        <DeleteCustomerDialog
          customer={customer}
          path={path}
          then="list"
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
