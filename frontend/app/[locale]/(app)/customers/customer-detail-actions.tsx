"use client";

import { useTranslations } from "next-intl";
import {
  CopyIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteCustomerDialog, type CustomerRef } from "./customer-dialogs";

/** Actions on the customer's page, in a menu. */
export function CustomerDetailActions({ customer }: { customer: CustomerRef }) {
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
              variant="outline"
              size="icon-sm"
              aria-label={t("actionsFor", { name: customer.name })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
            <PencilIcon />
            {t("edit")}
          </DropdownMenuItem>
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
          then="list"
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
