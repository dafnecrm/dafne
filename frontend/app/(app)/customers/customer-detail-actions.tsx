"use client";

import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  CustomerActionsMenu,
  useCustomerActions,
  type CustomerRef,
} from "./customer-actions";

/** Actions on the customer's page, in a menu. */
export function CustomerDetailActions({ customer }: { customer: CustomerRef }) {
  const { items, dialogs } = useCustomerActions(customer, {
    placement: "detail",
  });

  return (
    <CustomerActionsMenu
      customer={customer}
      variant="outline"
      dialogs={dialogs}
    >
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
