"use client";

import { ReactNode, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  createDataTableColumnHelper,
  useDescribeFilters,
  DataTable,
} from "@dafne/frontend-data-table/table";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";

import { FileIcon } from "lucide-react";
import { ActivityTableActions } from "./activity-table-actions";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import type { TableParams } from "@dafne/frontend-data-table";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import { Badge } from "@dafne/frontend-ui/components/badge";
import { ListedActivity } from "../types";
import { ACTIVITY_TYPE_OPTIONS } from "../activity-type-options";
import { ACTIVITY_STATUS_OPTIONS } from "../activity-status-options";
import { ActivitiesTableConfig } from "../activities-table";
import { ACTIVITY_STATUS_ICONS } from "./activity-status-icons";

/*
 * Columns of the activities table. Column ids double as the backend's
 * sort fields, so they must match activitiesTable.sortable in
 * lib/activities-table.ts.
 */

const col = createDataTableColumnHelper<ListedActivity>();

/** Translated per language; memoized, so the table sees the same columns on every render. */
// dafne-ignore: completedAt
function useActivityColumns() {
  const t = useTranslations();
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("activities.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`/activities/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("name", {
          header: t("activities.fields.name"),
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
          header: t("activities.fields.type"),
          cell: (info) => optionLabel(ACTIVITY_TYPE_OPTIONS, info.getValue()),
        }),
        col.accessor("status", {
          header: t("activities.fields.status"),
          cell: (info) => {
            const status = ACTIVITY_STATUS_OPTIONS.find(
              (o) => o.value === info.getValue(),
            );
            if (!status) return "—";
            // A component, not an element: render it with a capitalized name.
            const Icon = ACTIVITY_STATUS_ICONS[status.value];
            return (
              <Badge variant="outline">
                <Icon className="size-4 text-muted-foreground" />
                {t(status.label)}
              </Badge>
            );
          },
        }),
        col.accessor("dueDate", {
          header: t("activities.fields.dueDate"),
          cell: (info) => {
            const value = info.getValue();
            return value ? <LocalDate value={value} format="dateTime" /> : "—";
          },
        }),
        col.accessor("createdAt", {
          header: t("activities.fields.createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              format="dateTime"
              className="text-muted-foreground"
            />
          ),
        }),
      ]),
    [t, optionLabel],
  );
}

const getRowId = (activity: ListedActivity) => String(activity.id);

export interface ActivitiesTableProps {
  /** The app's table, from defineActivitiesTable. */
  config: ActivitiesTableConfig;
  /** One page of activities, from the server page. */
  activities: ListedActivity[];
  total: number;
  params: TableParams;
  /**
   * Replaces the row menu (view, edit, copy email, delete). Keep the
   * function stable (module scope), so the table doesn't re-render rows.
   */
  rowActions?: (activity: ListedActivity) => ReactNode;
}

/** Activities list; the server page passes one page of activities. */
export function ActivitiesTable({
  config,
  activities,
  total,
  params,
  rowActions,
}: ActivitiesTableProps) {
  const t = useTranslations("activities");
  const describeFilters = useDescribeFilters();
  const columns = useActivityColumns();

  // Stable per path, so the table sees the same function on every render.
  const defaultActions = useCallback(
    (activity: ListedActivity) => (
      <ActivityTableActions activity={activity} path={config.path} />
    ),
    [config.path],
  );

  return (
    <DataTable
      columns={columns}
      data={activities}
      getRowId={getRowId}
      config={config}
      rowActions={rowActions ?? defaultActions}
      params={params}
      total={total}
      noun={t("noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileIcon />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("empty.filtered", {
                    filter: describeFilters(
                      params.filters,
                      config.filters,
                    ),
                  })
                : t("empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
