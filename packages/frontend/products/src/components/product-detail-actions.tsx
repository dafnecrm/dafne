"use client";

import { useTranslations } from "next-intl";
import {
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
  HistoryIcon,
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
import { ProductChangelogSheet } from "./product-changelog.tsx";

/**
 * Actions on the product's page, in a menu: edit (`<path>/<id>/edit`) and
 * delete, then back to the list at `path`.
 */
export function ProductDetailActions({
  product,
  path,
}: {
  product: ProductRef;
  path: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [history, setHistory] = useState(false);
  const t = useTranslations("common");
  const tChangelog = useTranslations("changelog");
  const href = `${path}/${encodeURIComponent(product.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("actionsFor", { name: product.name })}
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
          <DropdownMenuItem onClick={() => setHistory(true)}>
            <HistoryIcon />
            {tChangelog("open")}
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
      <ProductChangelogSheet
        productId={product.id}
        open={history}
        onOpenChange={setHistory}
      />
      {/* Outside the menu, which closes when an item is clicked. */}
      {deleting && (
        <DeleteProductDialog
          product={product}
          path={path}
          then="list"
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
