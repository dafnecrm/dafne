"use client";

import { FileIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
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
import { useOptionLabel } from "@/i18n/options";
import type { TableParams } from "@dafne/frontend-data-table";
import type { ListedOrder } from "@/lib/orders";
import { ordersTable } from "@/lib/orders-table";
import { OrderTableActions } from "./order-table-actions";

/*
 * Columns of the orders table. Column ids double as the backend's
 * sort fields, so they must match ordersTable.sortable in
 * lib/orders-table.ts.
 */

const col = createDataTableColumnHelper<ListedOrder>();

/** Translated per language; memoized, so the table sees the same columns on every render. */
function useOrderColumns() {
  const t = useTranslations();
  // Labels of enum values, for their columns.
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: t("orders.fields.name"),
          cell: ({ row }) => (
            <Link
              href={`/orders/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.name}
            </Link>
          ),
        }),
        col.accessor("notes", {
          header: t("orders.fields.notes"),
          cell: (info) => info.getValue() ?? "—",
        }),
        col.accessor("createdAt", {
          header: t("orders.fields.createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground"
            />
          ),
        }),
      ]),
    [t, optionLabel],
  );
}

// Module scope, so the table sees the same function on every render.
const orderActions = (order: ListedOrder) => (
  <OrderTableActions order={order} />
);

const getRowId = (order: ListedOrder) => order.id;

/** Orders list; the server page passes one page of orders. */
export function OrdersTable({
  orders,
  total,
  params,
}: {
  orders: ListedOrder[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useOrderColumns();
  return (
    <DataTable
      columns={columns}
      data={orders}
      getRowId={getRowId}
      config={ordersTable}
      rowActions={orderActions}
      params={params}
      total={total}
      noun={t("orders.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileIcon />
            </EmptyMedia>
            <EmptyTitle>{t("orders.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("orders.empty.filtered", {
                    filter: describeFilters(
                      params.filters,
                      ordersTable.filters,
                    ),
                  })
                : t("orders.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
