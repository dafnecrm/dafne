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
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteActivityButton } from "./delete-activity-button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { describeFilters, type TableParams } from "@/lib/data-table";

/*
 * Columns of the activities table. Column ids double as the backend's
 * sort fields, so they must match activitiesTable.sortable in
 * lib/activities-table.ts.
 */

const col = createDataTableColumnHelper<ListedActivity>();

// Module scope, so the table sees the same columns on every render.
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
    cell: (info) =>
      ACTIVITY_STATUS_OPTIONS.find((o) => o.value === info.getValue())?.label ??
      "—",
  }),
  col.accessor("completedAt", {
    header: "Completed at",
    cell: (info) => {
      const value = info.getValue();
      return value ? <LocalDate value={value} format="dateTime" /> : "—";
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

/** Row actions of the activities table (DataTable `rowActions`). */
function activityActions(activity: ListedActivity) {
  const href = `/activities/${encodeURIComponent(activity.id)}`;
  return (
    <>
      <DeleteActivityButton activity={activity} then="refresh" iconOnly />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${activity.name}`}
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
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

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
