"use client";

import {
  CopyIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ListedCustomer } from "@/lib/customers";
import { DeleteCustomerButton } from "./delete-customer-button";

/** Row actions of the customers table (DataTable `rowActions`). */
export function customerActions(customer: ListedCustomer) {
  const href = `/customers/${encodeURIComponent(customer.id)}`;
  return (
    <>
      <DeleteCustomerButton customer={customer} then="refresh" iconOnly />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${customer.name}`}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={href} />}>
            <UserRoundIcon />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          {customer.email && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(customer.email!)}
              >
                <CopyIcon />
                Copy email
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
