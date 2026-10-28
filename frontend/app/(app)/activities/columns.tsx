"use client";

import Link from "next/link";
import { createDataTableColumnHelper } from "@/components/data-table";
import { LocalDate } from "@/components/local-date";
import type { ListedActivity } from "@/lib/activities";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/activities-table";

/*
 * Columns of the activities table. Column ids double as the backend's
 * sort fields, so they must match activitiesTable.sortable in
 * lib/activities-table.ts.
 */

const col = createDataTableColumnHelper<ListedActivity>();

// Module scope, so the table sees the same columns on every render.
export const activityColumns = col.columns([
  col.accessor("name", {
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/activities/${encodeURIComponent(row.original.id)}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  }),
  col.accessor("type", {
    header: "Type",
    cell: (info) => {
      console.log(info.row);
      return ACTIVITY_TYPE_OPTIONS.find((o) => o.value === info.getValue())?.label ??
        "—";
    }
  }),
  col.accessor("createdAt", {
    header: "Added",
    meta: { className: "text-right" },
    cell: (info) => (
      <LocalDate value={info.getValue()} className="text-muted-foreground" />
    ),
  }),
]);
