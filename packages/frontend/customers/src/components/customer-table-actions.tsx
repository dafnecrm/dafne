"use client";

import { useTranslations } from "next-intl";
import {
  CopyIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
  UserRoundIcon,
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

/**
 * Actions of a row of the customers table, in a menu: view (`<path>/<id>`),
 * edit (`<path>/<id>/edit`), copy the email, delete.
 */
export function CustomerTableActions({
  customer,
  path,
}: {
  customer: CustomerRef;
  /** Path of the app's customers list. */
  path: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("common");
  const href = `${path}/${encodeURIComponent(customer.id)}`;
  const { email } = customer;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("actionsFor", { name: customer.name })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={href} />}>
            <UserRoundIcon />
            {t("viewDetails")}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
            <PencilIcon />
            {t("edit")}
          </DropdownMenuItem>
          {email && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(email)}
              >
                <CopyIcon />
                {t("copyEmail")}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2Icon />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which closes when an item is clicked. */}
      {deleting && (
        <DeleteCustomerDialog
          customer={customer}
          path={path}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
