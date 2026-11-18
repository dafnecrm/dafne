"use client";

import { UsersRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  createDataTableColumnHelper,
  DataTable,
  useDescribeFilters,
} from "@dafne/frontend-data-table/table";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { Badge } from "@dafne/frontend-ui/components/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import type { TableParams } from "@dafne/frontend-data-table";
import type { UserGroupsTableConfig } from "../user-groups-table.ts";
import type { ListedUserGroup } from "../types.ts";
import { UserGroupTableActions } from "./user-group-table-actions.tsx";
import Link from "next/link";

/*
 * Columns of the user groups table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../user-groups-table.ts.
 */

const col = createDataTableColumnHelper<ListedUserGroup>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useUserGroupColumns(path: string) {
  const t = useTranslations();
  // Labels of enum values, for their columns.
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("userGroups.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("name", { header: t("userGroups.fields.name") }),
        col.accessor("description", {
          header: t("userGroups.fields.description"),
          cell: (info) => info.getValue() ?? "—",
        }),
        col.accessor("memberCount", {
          header: t("userGroups.fields.memberCount"),
          meta: { className: "text-right" },
          enableSorting: false,
          // An all-users group has no list: it's everyone.
          cell: ({ row }) =>
            row.original.allUsers ? (
              <Badge variant="secondary">{t("userGroups.allUsers.badge")}</Badge>
            ) : (
              row.original.memberCount
            ),
        }),
        col.accessor("createdAt", {
          header: t("userGroups.fields.createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground tabular-nums font-medium"
            />
          ),
        }),
      ]),
    [t, optionLabel, path],
  );
}

const getRowId = (userGroup: ListedUserGroup) => String(userGroup.id);

/**
 * User groups list; the server page passes the app's config and one page
 * of user groups.
 */
export function UserGroupsTable({
  config,
  userGroups,
  total,
  params,
}: {
  config: UserGroupsTableConfig;
  userGroups: ListedUserGroup[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useUserGroupColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const userGroupActions = useCallback(
    (userGroup: ListedUserGroup) => (
      <UserGroupTableActions userGroup={userGroup} path={config.path} />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={userGroups}
      getRowId={getRowId}
      config={config}
      rowActions={userGroupActions}
      params={params}
      total={total}
      noun={t("userGroups.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersRoundIcon />
            </EmptyMedia>
            <EmptyTitle>{t("userGroups.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("userGroups.empty.filtered", {
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("userGroups.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
