"use client";

import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  DeleteQuotationDialog,
  type QuotationRef,
} from "./quotation-dialogs.tsx";
import { QUOTATION_EDITABLE_STATUSES } from "../quotations-table.ts";

/**
 * Actions of a row of the quotations table, in a menu: view (`<path>/<id>`),
 * edit (`<path>/<id>/edit`), delete.
 */
export function QuotationTableActions({
  quotation,
  path,
}: {
  quotation: QuotationRef;
  path: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations();
  const href = `${path}/${encodeURIComponent(quotation.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.actionsFor", {
                name: `${t("quotations.singular")} ${quotation.id}`,
              })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
            <DropdownMenuItem render={<Link href={href} />}>
              <EyeIcon />
              {t("common.viewDetails")}
            </DropdownMenuItem>
            {QUOTATION_EDITABLE_STATUSES.has(quotation.status) &&
              <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
                <PencilIcon />
                {t("common.edit")}
              </DropdownMenuItem>}
          </DropdownMenuGroup>
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
        <DeleteQuotationDialog
          quotation={quotation}
          path={path}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
