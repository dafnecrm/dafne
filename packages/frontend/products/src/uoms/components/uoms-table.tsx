"use client";

import { RulerIcon } from "lucide-react";
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
import { type UomsTableConfig, UOM_KIND_OPTIONS } from "../uoms-table.ts";
import type { ListedUom } from "../types.ts";
import { UomTableActions } from "./uom-table-actions.tsx";
import Link from "next/link";

/*
 * Columns of the uoms table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../uoms-table.ts.
 */

const col = createDataTableColumnHelper<ListedUom>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useUomColumns(path: string) {
  const t = useTranslations();
  // Labels of enum values, for their columns.
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("uoms.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("name", { header: t("uoms.fields.name") }),
        col.accessor("description", {
          header: t("uoms.fields.description"),
          cell: (info) => info.getValue() ?? "—",
        }),
        col.accessor("kind", {
          header: t("uoms.fields.kind"),
          cell: (info) => optionLabel(UOM_KIND_OPTIONS, info.getValue()),
        }),
        col.accessor("createdAt", {
          header: t("uoms.fields.createdAt"),
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

const getRowId = (uom: ListedUom) => String(uom.id);

/**
 * Uoms list; the server page passes the app's config and one page
 * of uoms.
 */
export function UomsTable({
  config,
  uoms,
  total,
  params,
}: {
  config: UomsTableConfig;
  uoms: ListedUom[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useUomColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const uomActions = useCallback(
    (uom: ListedUom) => <UomTableActions uom={uom} path={config.path} />,
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={uoms}
      getRowId={getRowId}
      config={config}
      rowActions={uomActions}
      params={params}
      total={total}
      noun={t("uoms.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RulerIcon />
            </EmptyMedia>
            <EmptyTitle>{t("uoms.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("uoms.empty.filtered", {
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("uoms.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
