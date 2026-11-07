"use client";

import { PackageIcon } from "lucide-react";
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import type { TableParams } from "@dafne/frontend-data-table";
import type { SalesOrdersTableConfig } from "../sales-orders-table.ts";
import type { ListedSalesOrder } from "../types.ts";
import { SalesOrderTableActions } from "./sales-order-table-actions.tsx";
import Link from "next/link";
import { Button } from "@dafne/frontend-ui/components/button";

/*
 * Columns of the sales orders table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../sales-orders-table.ts.
 */

const col = createDataTableColumnHelper<ListedSalesOrder>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useSalesOrderColumns(path: string) {
  const t = useTranslations();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("salesOrders.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("createdAt", {
          header: t("salesOrders.fields.createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground"
            />
          ),
        }),
      ]),
    [t, path],
  );
}

const getRowId = (salesOrder: ListedSalesOrder) => String(salesOrder.id);

/**
 * Sales orders list; the server page passes the app's config and one page of
 * sales orders.
 */
export function SalesOrdersTable({
  config,
  salesOrders,
  total,
  params,
}: {
  config: SalesOrdersTableConfig;
  salesOrders: ListedSalesOrder[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useSalesOrderColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const salesOrderActions = useCallback(
    (salesOrder: ListedSalesOrder) => (
      <SalesOrderTableActions salesOrder={salesOrder} path={config.path} />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={salesOrders}
      getRowId={getRowId}
      config={config}
      rowActions={salesOrderActions}
      params={params}
      total={total}
      noun={t("salesOrders.noun")}
      empty={
        <Empty className="border border-solid">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageIcon />
            </EmptyMedia>
            <EmptyTitle>{t("salesOrders.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("salesOrders.empty.filtered", {
                  filter: describeFilters(params.filters, config.filters),
                })
                : t("salesOrders.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline">
              <Link href={`${config.path}/new`} className="flex items-center gap-2">
                {t("salesOrders.create")}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      }
    />
  );
}
