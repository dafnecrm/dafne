"use client";

import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  CustomerActionsMenu,
  useCustomerActions,
  type CustomerRef,
} from "./customer-actions";

/** Actions of a row of the customers table, in a menu. */
export function CustomerTableActions({ customer }: { customer: CustomerRef }) {
  const { items, dialogs } = useCustomerActions(customer, {
    placement: "table",
  });

  return (
    <CustomerActionsMenu customer={customer} variant="ghost" dialogs={dialogs}>
      {items.view}
      {items.edit}
      {items.copyEmail && (
        <>
          <DropdownMenuSeparator />
          {items.copyEmail}
        </>
      )}
      <DropdownMenuSeparator />
      {items.delete}
    </CustomerActionsMenu>
  );
}
