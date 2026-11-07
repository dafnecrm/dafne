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
import type { ListedOrder } from "../types.ts";
import { OrderTableActions } from "./order-table-actions.tsx";
import Link from "next/link";
import { Button } from "@dafne/frontend-ui/components/button";

/*
 * Columns of the orders table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../sales-orders-table.ts.
 */

const col = createDataTableColumnHelper<ListedOrder>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useOrderColumns(path: string) {
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

const getRowId = (order: ListedOrder) => String(order.id);

/**
 * Orders list; the server page passes the app's config and one page of
 * orders.
 */
export function OrdersTable({
  config,
  orders,
  total,
  params,
}: {
  config: SalesOrdersTableConfig;
  orders: ListedOrder[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useOrderColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const orderActions = useCallback(
    (order: ListedOrder) => (
      <OrderTableActions order={order} path={config.path} />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={orders}
      getRowId={getRowId}
      config={config}
      rowActions={orderActions}
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
