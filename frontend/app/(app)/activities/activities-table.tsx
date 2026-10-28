"use client";

import { FileIcon } from "lucide-react";
import { DataTable } from "@/components/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { describeFilters, type TableParams } from "@/lib/data-table";
import type { ListedActivity } from "@/lib/activities";
import { activitiesTable } from "@/lib/activities-table";
import { activityActions } from "./activity-actions";
import { activityColumns } from "./columns";

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
