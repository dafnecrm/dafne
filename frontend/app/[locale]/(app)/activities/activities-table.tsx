"use client";

import Link from "next/link";
import {
  createDataTableColumnHelper,
  DataTable,
} from "@/components/data-table";
import { LocalDate } from "@/components/local-date";
import type { ListedActivity } from "@/lib/activities";
import {
  ACTIVITY_TYPE_OPTIONS,
  activitiesTable,
  ACTIVITY_STATUS_OPTIONS,
} from "@/lib/activities-table";
import { FileIcon } from "lucide-react";
import { ActivityTableActions } from "./activity-table-actions";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { describeFilters, type TableParams } from "@/lib/data-table";
import { Badge } from "@/components/ui/badge";

/*
 * Columns of the activities table. Column ids double as the backend's
 * sort fields, so they must match activitiesTable.sortable in
 * lib/activities-table.ts.
 */

const col = createDataTableColumnHelper<ListedActivity>();

// Module scope, so the table sees the same columns on every render.
// dafne-ignore: completedAt
const activityColumns = col.columns([
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
      return (
        ACTIVITY_TYPE_OPTIONS.find((o) => o.value === info.getValue())?.label ??
        "—"
      );
    },
  }),
  col.accessor("status", {
    header: "Status",
    cell: (info) => {
      const status = ACTIVITY_STATUS_OPTIONS.find(
        (o) => o.value === info.getValue(),
      );
      if (!status) return "—";
      // A component, not an element: render it with a capitalized name.
      const Icon = status.icon;
      return (
        <Badge variant="outline">
          <Icon className="size-4 text-muted-foreground" />
          {status.label}
        </Badge>
      );
    },
  }),
  col.accessor("dueDate", {
    header: "Due date",
    cell: (info) => {
      const value = info.getValue();
      return value ? <LocalDate value={value} format="dateTime" /> : "—";
    },
  }),
  col.accessor("createdAt", {
    header: "Added",
    meta: { className: "text-right" },
    cell: (info) => (
      <LocalDate
        value={info.getValue()}
        format="dateTime"
        className="text-muted-foreground"
      />
    ),
  }),
]);

// Module scope, so the table sees the same function on every render.
const activityActions = (activity: ListedActivity) => (
  <ActivityTableActions activity={activity} />
);

const getRowId = (activity: ListedActivity) => activity.id;

/** Activities list; the server page passes one page of activities. */
export function ActivitiesTable({
  activities,
  total,
  params,
}: {
  activities: ListedActivity[];
  total: number;
  params: TableParams;
}) {
  return (
    <DataTable
      columns={activityColumns}
      data={activities}
      getRowId={getRowId}
      config={activitiesTable}
      rowActions={activityActions}
      params={params}
      total={total}
      noun="activities"
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileIcon />
            </EmptyMedia>
            <EmptyTitle>No activities found</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? `No activity where ${describeFilters(params.filters, activitiesTable.filters)}.`
                : "Add your first activity to get started."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
