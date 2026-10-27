"use client";

import Link from "next/link";
import { createDataTableColumnHelper } from "@/components/data-table";
import { LocalDate } from "@/components/local-date";
import type { ListedCustomer } from "@/lib/customers";

/*
 * Columns of the customers table. Column ids double as the backend's sort
 * fields, so they must match customersTable.sortable in lib/customers-table.ts.
 */

const col = createDataTableColumnHelper<ListedCustomer>();

const empty = <span className="text-muted-foreground">—</span>;

// Module scope, so the table sees the same columns on every render.
export const customerColumns = col.columns([
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
        <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
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
