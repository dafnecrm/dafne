"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createDataTableColumnHelper,
  DataTable,
} from "@/components/data-table";
import { LocalDate } from "@/components/local-date";
import type { ListedCustomer } from "@/lib/customers";
import {
  CopyIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  UserRoundIcon,
  ContactIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteCustomerDialog } from "./delete-customer-button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { describeFilters, type TableParams } from "@/lib/data-table";
import { customersTable } from "@/lib/customers-table";

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
  col.accessor("createdAt", {
    header: "Added",
    meta: { className: "text-right" },
    cell: (info) => (
      <LocalDate value={info.getValue()} className="text-muted-foreground" />
    ),
  }),
]);

/** Row actions of the customers table: a menu, with Delete last. */
function CustomerRowActions({ customer }: { customer: ListedCustomer }) {
  const [deleting, setDeleting] = useState(false);
  const href = `/customers/${encodeURIComponent(customer.id)}`;
  return (
    <>
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
      {/* Outside the menu, which closes when the item is clicked. */}
      <DeleteCustomerDialog
        customer={customer}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </>
  );
}

// A component per row (it has state); module scope keeps it stable.
const customerActions = (customer: ListedCustomer) => (
  <CustomerRowActions customer={customer} />
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
