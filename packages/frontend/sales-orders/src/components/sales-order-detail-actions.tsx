"use client";

import {
  EllipsisVerticalIcon,
  HistoryIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Can } from "@dafne/frontend-permissions";
import { useState } from "react";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import {
  DeleteSalesOrderDialog,
  type SalesOrderRef,
} from "./sales-order-dialogs.tsx";
import { SalesOrderChangelogSheet } from "./sales-order-changelog.tsx";
import { DownloadPdfMenuItems } from "@dafne/frontend-documents/components/document-pdf-menu-items";
import { PdfTemplate } from "@dafne/frontend-documents/components/document-pdf-menu";

/**
 * Actions on the sales order's page, in a menu (a drawer on mobile): edit (`<path>/<id>/edit`),
 * its history (in a sheet) and delete, then back to the list at `path`.
 */
export function SalesOrderDetailActions({
  salesOrder,
  path,
  pdfTemplates,
}: {
  salesOrder: SalesOrderRef;
  path: string;
  pdfTemplates: PdfTemplate[];
}) {
  const [deleting, setDeleting] = useState(false);
  const [history, setHistory] = useState(false);
  const t = useTranslations();
  const href = `${path}/${encodeURIComponent(salesOrder.id)}`;

  return (
    <>
      <Can I="update" a="SalesOrder">
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          nativeButton={false}
          render={<Link href={`${href}/edit`} />}>
          <PencilIcon />
          {t("common.edit")}
        </Button>
      </Can>
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
          <DropdownMenuGroup className="sm:hidden">
            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
            <Can I="update" a="SalesOrder">
              <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
                <PencilIcon />
                {t("common.edit")}
              </DropdownMenuItem>
            </Can>
            <DropdownMenuSeparator />
          </DropdownMenuGroup>
          <DownloadPdfMenuItems
            resource="salesOrder"
            id={salesOrder.id}
            templates={pdfTemplates}
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setHistory(true)}>
            <HistoryIcon />
            {t("changelog.open")}
          </DropdownMenuItem>
          <Can I="delete" a="SalesOrder">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleting(true)}
            >
              <Trash2Icon />
              {t("common.delete")}
            </DropdownMenuItem>
          </Can>
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
