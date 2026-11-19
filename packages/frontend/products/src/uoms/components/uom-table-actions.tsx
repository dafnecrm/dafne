"use client";

import {
  EllipsisVerticalIcon,
  EyeIcon,
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import { DeleteUomDialog, type UomRef } from "./uom-dialogs.tsx";

/**
 * Actions of a row of the uoms table, in a menu: view (`<path>/<id>`),
 * edit (`<path>/<id>/edit`), delete.
 */
export function UomTableActions({ uom, path }: { uom: UomRef; path: string }) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations();
  const href = `${path}/${encodeURIComponent(uom.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.actionsFor", {
                name: `${t("uoms.singular")} ${uom.id}`,
              })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={href} />}>
            <EyeIcon />
            {t("common.viewDetails")}
          </DropdownMenuItem>
          <Can I="update" a="Uom">
            <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
              <PencilIcon />
              {t("common.edit")}
            </DropdownMenuItem>
          </Can>
          <Can I="delete" a="Uom">
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
      {deleting && (
        <DeleteUomDialog
          uom={uom}
          path={path}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
