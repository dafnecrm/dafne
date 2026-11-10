"use client";

import { EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import {
  DeleteSalesOrderTypeDialog,
  type SalesOrderTypeRef,
} from "./sales-order-type-dialogs.tsx";

/**
 * Actions on the sales order type's page, in a menu: edit (`<path>/<id>/edit`)
 * and delete, then back to the list at `path`.
 */
export function SalesOrderTypeDetailActions({
  salesOrderType,
  path,
}: {
  salesOrderType: SalesOrderTypeRef;
  path: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations();
  const href = `${path}/${encodeURIComponent(salesOrderType.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("common.actionsFor", {
                name: `${t("salesOrderTypes.singular")} ${salesOrderType.id}`,
              })}
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
      {deleting && (
        <DeleteSalesOrderTypeDialog
          salesOrderType={salesOrderType}
          path={path}
          then="list"
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
