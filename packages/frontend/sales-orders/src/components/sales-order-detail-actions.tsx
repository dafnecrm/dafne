"use client";

import { EllipsisVerticalIcon, HistoryIcon, PencilIcon, Trash2Icon } from "lucide-react";
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
  DeleteSalesOrderDialog,
  type SalesOrderRef,
} from "./sales-order-dialogs.tsx";
import { SalesOrderChangelogSheet } from "./sales-order-changelog.tsx";

/**
 * Actions on the sales order's page, in a menu: edit (`<path>/<id>/edit`),
 * its history (in a sheet) and delete, then back to the list at `path`.
 */
export function SalesOrderDetailActions({
  salesOrder,
  path,
}: {
  salesOrder: SalesOrderRef;
  path: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [history, setHistory] = useState(false);
  const t = useTranslations();
  const href = `${path}/${encodeURIComponent(salesOrder.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("common.actionsFor", {
                name: `${t("salesOrders.singular")} ${salesOrder.id}`,
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
      <SalesOrderChangelogSheet
        salesOrderId={salesOrder.id}
        open={history}
        onOpenChange={setHistory}
      />
      {deleting && (
        <DeleteSalesOrderDialog
          salesOrder={salesOrder}
          path={path}
          then="list"
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
