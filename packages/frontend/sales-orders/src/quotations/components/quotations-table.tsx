"use client";

import { FileTextIcon } from "lucide-react";
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
import {
  type QuotationsTableConfig,
  QUOTATION_STATUS_OPTIONS,
} from "../quotations-table.ts";
import type { ListedQuotation } from "../types.ts";
import { QuotationTableActions } from "./quotation-table-actions.tsx";
import Link from "next/link";
import { QuotationStatusBadge } from "./quotation-status-badge.tsx";

/*
 * Columns of the quotations table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../quotations-table.ts.
 */

const col = createDataTableColumnHelper<ListedQuotation>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useQuotationColumns(path: string) {
  const t = useTranslations();
  // Labels of enum values, for their columns.
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("quotations.fields.id"),
          meta: { className: "w-20", mobile: "subtitle" },
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("type", {
          header: t("quotations.fields.typeId"),
          enableSorting: false,
          cell: ({ row }) => row.original.type.description,
        }),
        col.accessor("customer", {
          header: t("quotations.fields.customerId"),
          enableSorting: false,
          cell: ({ row }) => row.original.customer.name,
          meta: { mobile: "title" },
        }),
        col.accessor("status", {
          header: t("quotations.fields.status"),
          meta: { mobile: "aside" },
          cell: (info) => <QuotationStatusBadge status={info.getValue()} />,
        }),
        col.accessor("validUntil", {
          header: t("quotations.fields.validUntil"),
          cell: (info) => {
            const value = info.getValue();
            return value ? <LocalDate value={value} format="date" /> : "—";
          },
        }),
        col.accessor("acceptedAt", {
          header: t("quotations.fields.acceptedAt"),
          cell: (info) => {
            const value = info.getValue();
            return value ? <LocalDate value={value} format="date" /> : "—";
          },
        }),
        col.accessor("rejectedAt", {
          header: t("quotations.fields.rejectedAt"),
          cell: (info) => {
            const value = info.getValue();
            return value ? <LocalDate value={value} format="date" /> : "—";
          },
        }),
        col.accessor("createdAt", {
          header: t("quotations.fields.createdAt"),
          meta: { className: "text-right", mobile: "hidden" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground tabular-nums font-medium"
            />
          ),
        }),
        col.accessor("itemsCount", {
          header: t("quotations.fields.itemsCount"),
          meta: { className: "text-right @2xl:hidden" },
          cell: ({ row }) => row.original.itemsCount ?? 0,
        }),
      ]),
    [t, optionLabel, path],
  );
}

const getRowId = (quotation: ListedQuotation) => String(quotation.id);

/**
 * Quotations list; the server page passes the app's config and one page
 * of quotations.
 */
export function QuotationsTable({
  config,
  quotations,
  total,
  params,
}: {
  config: QuotationsTableConfig;
  quotations: ListedQuotation[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useQuotationColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const quotationActions = useCallback(
    (quotation: ListedQuotation) => (
      <QuotationTableActions quotation={quotation} path={config.path} />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={quotations}
      getRowId={getRowId}
      config={config}
      rowActions={quotationActions}
      params={params}
      total={total}
      noun={t("quotations.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>{t("quotations.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("quotations.empty.filtered", {
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("quotations.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
