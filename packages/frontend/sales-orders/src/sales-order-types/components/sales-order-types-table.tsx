"use client";

import { FileIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  createDataTableColumnHelper,
  DataTable,
  useDescribeFilters,
} from "@dafne/frontend-data-table/table";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import type { TableParams } from "@dafne/frontend-data-table";
import type { SalesOrderTypesTableConfig } from "../sales-order-types-table.ts";
import type { ListedSalesOrderType } from "../types.ts";
import { SalesOrderTypeTableActions } from "./sales-order-type-table-actions.tsx";
import Link from "next/link";

/*
 * Columns of the sales order types table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../sales-order-types-table.ts.
 */

const col = createDataTableColumnHelper<ListedSalesOrderType>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useSalesOrderTypeColumns(path: string) {
  const t = useTranslations();
  // Labels of enum values, for their columns.
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("salesOrderTypes.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("description", {
          header: t("salesOrderTypes.fields.description"),
        }),
        col.accessor("createdAt", {
          header: t("salesOrderTypes.fields.createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground"
            />
          ),
        }),
      ]),
    [t, optionLabel, path],
  );
}

const getRowId = (salesOrderType: ListedSalesOrderType) =>
  String(salesOrderType.id);

/**
 * Sales order types list; the server page passes the app's config and one page
 * of sales order types.
 */
export function SalesOrderTypesTable({
  config,
  salesOrderTypes,
  total,
  params,
}: {
  config: SalesOrderTypesTableConfig;
  salesOrderTypes: ListedSalesOrderType[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useSalesOrderTypeColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const salesOrderTypeActions = useCallback(
    (salesOrderType: ListedSalesOrderType) => (
      <SalesOrderTypeTableActions
        salesOrderType={salesOrderType}
        path={config.path}
      />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={salesOrderTypes}
      getRowId={getRowId}
      config={config}
      rowActions={salesOrderTypeActions}
      params={params}
      total={total}
      noun={t("salesOrderTypes.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileIcon />
            </EmptyMedia>
            <EmptyTitle>{t("salesOrderTypes.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("salesOrderTypes.empty.filtered", {
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("salesOrderTypes.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
