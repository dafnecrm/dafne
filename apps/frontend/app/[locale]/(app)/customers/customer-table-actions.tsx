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
import { DeleteCustomerDialog, type CustomerRef } from "./customer-dialogs";

/** Actions of a row of the customers table, in a menu. */
export function CustomerTableActions({ customer }: { customer: CustomerRef }) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("common");
  const href = `/customers/${encodeURIComponent(customer.id)}`;
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
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
