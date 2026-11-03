"use client";

import {
  EllipsisVerticalIcon,
  EyeIcon,
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
import { DeleteProductDialog, type ProductRef } from "./product-dialogs";

/** Actions of a row of the products table, in a menu. */
export function ProductTableActions({ product }: { product: ProductRef }) {
  const [deleting, setDeleting] = useState(false);
  const href = `/products/${encodeURIComponent(product.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${product.name}`}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={href} />}>
            <EyeIcon />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which closes when an item is clicked. */}
      {deleting && (
        <DeleteProductDialog
          product={product}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
