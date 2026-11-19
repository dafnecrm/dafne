"use client";

import { ArrowRightLeftIcon } from "lucide-react";
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
import type { UomConversionsTableConfig } from "../uom-conversions-table.ts";
import type { ListedUomConversion } from "../types.ts";
import { UomConversionTableActions } from "./uom-conversion-table-actions.tsx";
import Link from "next/link";

/*
 * Columns of the uom conversions table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../uom-conversions-table.ts.
 */

const col = createDataTableColumnHelper<ListedUomConversion>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useUomConversionColumns(path: string) {
  const t = useTranslations();
  // Labels of enum values, for their columns.
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("uomConversions.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("fromUomId", {
          header: t("uomConversions.fields.fromUomId"),
          cell: ({ row }) => `${row.original.from.id} · ${row.original.from.name}`,
        }),
        col.accessor("toUomId", {
          header: t("uomConversions.fields.toUomId"),
          cell: ({ row }) => `${row.original.to.id} · ${row.original.to.name}`,
        }),
        col.accessor("factor", {
          header: t("uomConversions.fields.factor"),
          meta: { className: "text-right" },
          cell: ({ row }) =>
            t("uomConversions.fields.equals", {
              from: row.original.fromUomId,
              to: row.original.toUomId,
              factor: row.original.factor,
            }),
        }),
        col.accessor("createdAt", {
          header: t("uomConversions.fields.createdAt"),
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

const getRowId = (uomConversion: ListedUomConversion) =>
  String(uomConversion.id);

/**
 * Uom conversions list; the server page passes the app's config and one page
 * of uom conversions.
 */
export function UomConversionsTable({
  config,
  uomConversions,
  total,
  params,
}: {
  config: UomConversionsTableConfig;
  uomConversions: ListedUomConversion[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useUomConversionColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const uomConversionActions = useCallback(
    (uomConversion: ListedUomConversion) => (
      <UomConversionTableActions
        uomConversion={uomConversion}
        path={config.path}
      />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={uomConversions}
      getRowId={getRowId}
      config={config}
      rowActions={uomConversionActions}
      params={params}
      total={total}
      noun={t("uomConversions.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArrowRightLeftIcon />
            </EmptyMedia>
            <EmptyTitle>{t("uomConversions.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("uomConversions.empty.filtered", {
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("uomConversions.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
