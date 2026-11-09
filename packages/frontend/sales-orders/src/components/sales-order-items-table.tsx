'use client';

import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import { defineDataTable, TableParams } from "@dafne/frontend-data-table";
import { createDataTableColumnHelper, DataTable } from "@dafne/frontend-data-table/table";
import { Button } from "@dafne/frontend-ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@dafne/frontend-ui/components/empty";
import { MapPinIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { SalesOrderDetailItem } from "@dafne/contracts";
import { SalesOrderItemsTableConfig } from "../sales-orders-items-table";
import { ListedSalesOrder } from "../types";

export interface SalesOrderItemsTableProps {
  /** The app's table, from defineCustomersTable. */
  config: SalesOrderItemsTableConfig;
  /** One page of customers, from the server page. */
  items: ListedSalesOrder[];
  total: number;
  params: TableParams;
  rowActions?: (salesOrderItem: SalesOrderDetailItem) => ReactNode;
}

/**
 * A row: an item of the saved order (`SalesOrderDetailItem`) or of the
 * form (no product while blank, its name when known).
 */
export interface SalesOrderItemRow {
  position: number | null;
  productId: number | null;
  quantity: number | null;
  product?: { name: string };
}

const col = createDataTableColumnHelper<SalesOrderItemRow>();

function useSalesOrderItemColumns() {
  const t = useTranslations("salesOrders.items.fields")
  const locale = useLocale()
  const optionLabel = useOptionLabel()
  return useMemo(
    () =>
      col.columns([
        col.accessor("position", {
          header: t("position"),
          cell: ({ row }) => (
            row.original.position
          ),
        }),
        col.accessor(
          (item) => item.product?.name ?? item.productId,
          { id: "products", header: t("productId") },
        ),
        col.accessor("quantity", {
          header: t("quantity"),
          cell: ({ row }) => (
            row.original.quantity
          ),
        }),
      ]),
    [t, optionLabel, locale],
  );
}

/**
 * A customer's addresses. With none, links to the edit page
 * (`<path>/<id>/edit`, `path` being the app's customers list).
 */
export function SalesOrderItemTable({
  salesOrderId,
  items,
  path,
  rowActions
}: {
  salesOrderId: number,
  items: SalesOrderItemRow[],
  path: string,
  rowActions?: (row: SalesOrderItemRow, index: number) => ReactNode;
}) {
  const t = useTranslations();
  const columns = useSalesOrderItemColumns()
  const params: TableParams = {
    filters: {},
    page: 1,
    pageSize: 5,
    offset: 0,
    sort: { id: "type", desc: false },
  }

  const tableConfig = defineDataTable({
    defaultSort: { id: "type", desc: false },
    sortable: ["position"],
    pageSizes: [5]
  })

  const editHref = `${path}/${encodeURIComponent(salesOrderId)}/edit`;

  return (<DataTable
    columns={columns}
    data={items}
    total={items?.length ?? 0}
    params={params}
    config={tableConfig}
    manualPagination={false}
    manualSorting={false}
    rowActions={rowActions}
    empty={<Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MapPinIcon />
        </EmptyMedia>
        <EmptyTitle>
          {t("salesOrders.items.none")}{" "}
        </EmptyTitle>
        <EmptyDescription>
          {t("salesOrders.items.noneDetail")}{" "}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm">
          <Link href={editHref}>
            {t("salesOrders.items.addOne")}
          </Link>
        </Button>
      </EmptyContent>
    </Empty>}
  />)
}
