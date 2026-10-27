"use client";

import { ContactIcon } from "lucide-react";
import { DataTable } from "@/components/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { describeFilters, type TableParams } from "@/lib/data-table";
import type { ListedCustomer } from "@/lib/customers";
import { customersTable } from "@/lib/customers-table";
import { customerActions } from "./customer-actions";
import { customerColumns } from "./columns";

const getRowId = (customer: ListedCustomer) => customer.id;

/** Customers list; the server page passes one page of customers. */
export function CustomersTable({
  customers,
  total,
  params,
}: {
  customers: ListedCustomer[];
  total: number;
  params: TableParams;
}) {
  return (
    <DataTable
      columns={customerColumns}
      data={customers}
      getRowId={getRowId}
      config={customersTable}
      rowActions={customerActions}
      params={params}
      total={total}
      noun="customers"
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ContactIcon />
            </EmptyMedia>
            <EmptyTitle>No customers found</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? `No customer where ${describeFilters(params.filters, customersTable.filters)}.`
                : "Add your first customer to get started."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
