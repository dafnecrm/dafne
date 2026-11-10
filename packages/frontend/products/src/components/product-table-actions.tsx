"use client";

import { useTranslations } from "next-intl";
import {
  EllipsisVerticalIcon,
  EyeIcon,
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
import { DeleteProductDialog, type ProductRef } from "./product-dialogs.tsx";

/**
 * Actions of a row of the products table, in a menu: view (`<path>/<id>`),
 * edit (`<path>/<id>/edit`), delete.
 */
export function ProductTableActions({
  product,
  path,
}: {
  product: ProductRef;
  path: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("common");
  const href = `${path}/${encodeURIComponent(product.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("actionsFor", { name: product.name })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={href} />}>
            <EyeIcon />
            {t("viewDetails")}
          </DropdownMenuItem>
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
        <DeleteProductDialog
          product={product}
          path={path}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
