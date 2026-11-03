"use client";

import Link from "next/link";
import {
  createDataTableColumnHelper,
  DataTable,
} from "@/components/data-table";
import { LocalDate } from "@/components/local-date";
import type { ListedCustomer } from "@/lib/customers";
import { ContactIcon } from "lucide-react";
import { CustomerTableActions } from "./customer-table-actions";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { describeFilters, type TableParams } from "@/lib/data-table";
import { customersTable, CUSTOMER_TYPE_OPTIONS } from "@/lib/customers-table";

/*
 * Columns of the customers table. Column ids double as the backend's sort
 * fields, so they must match customersTable.sortable in lib/customers-table.ts.
 */

const col = createDataTableColumnHelper<ListedCustomer>();

const empty = <span className="text-muted-foreground">—</span>;

// Module scope, so the table sees the same columns on every render.
const customerColumns = col.columns([
  col.accessor("name", {
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/customers/${encodeURIComponent(row.original.id)}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  }),
  col.accessor("email", {
    header: "Email",
    cell: (info) => {
      const email = info.getValue();
      return email ? (
        <a
          href={`mailto:${email}`}
          className="underline-offset-4 hover:underline"
        >
          {email}
        </a>
      ) : (
        empty
      );
    },
  }),
  col.accessor("phone", {
    header: "Phone",
    cell: (info) => {
      const phone = info.getValue();
      return phone ? (
        <a href={`tel:${phone}`} className="underline-offset-4 hover:underline">
          {phone}
        </a>
      ) : (
        empty
      );
    },
  }),
  col.accessor("type", {
    header: "Type",
    cell: (info) =>
      CUSTOMER_TYPE_OPTIONS.find((o) => o.value === info.getValue())?.label ??
      "—",
  }),
  col.accessor("birthDate", {
    header: "Birth date",
    cell: (info) => {
      const value = info.getValue();
      return value ? <LocalDate value={value} format="date" /> : "—";
    },
  }),
  col.accessor("fiscalCode", {
    header: "Fiscal code",
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("vatNumber", {
    header: "VAT number",
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("createdAt", {
    header: "Added",
    meta: { className: "text-right" },
    cell: (info) => (
      <LocalDate value={info.getValue()} className="text-muted-foreground" />
    ),
  }),
]);

// Module scope, so the table sees the same function on every render.
const customerActions = (customer: ListedCustomer) => (
  <CustomerTableActions customer={customer} />
);

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
