"use client";

import { defineDataTable, type TableParams } from "@dafne/frontend-data-table";
import {
  createDataTableColumnHelper,
  DataTable,
} from "@dafne/frontend-data-table/table";
import {
  Empty, EmptyContent, EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@dafne/frontend-ui/components/empty";
import { MapPinIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@dafne/frontend-ui/lib/currencies";
import { type ReactNode, useMemo } from "react";

/**
 * A row: an item of the saved order (`SalesOrderDetailItem`) or of the
 * form (no product while blank, its name when known).
 */
export interface SalesOrderItemRow {
  position: number | null;
  productId: number | null;
  quantity: number | null;
  /** The quantity's unit; "" or null for the product's base unit. */
  uomId?: string | null;
  product?: { name: string };
  /** The quantity in the product's base unit, when known. */
  baseQuantity?: number;
  baseUomId?: string;
  /** The product's price, of one base unit (not converted), when known. */
  basePrice?: string;
  /** The item's price (the product's × the base quantity), when known. */
  price?: string;
}

const col = createDataTableColumnHelper<SalesOrderItemRow>();

function useSalesOrderItemColumns() {
  const t = useTranslations("salesOrders.items.fields");
  const locale = useLocale();
  return useMemo(
    () =>
      col.columns([
        col.accessor("position", {
          header: t("position"),
          cell: ({ row }) => row.original.position,
        }),
        col.accessor((item) => item.product?.name ?? item.productId, {
          id: "products",
          header: t("productId"),
        }),
        col.accessor("quantity", {
          header: t("quantity"),
          cell: ({ row }) =>
            [row.original.quantity, row.original.uomId].filter((part) => part != null && part !== "").join(" "),
        }),
        col.accessor("baseQuantity", {
          header: t("baseQuantity"),
          cell: ({ row }) =>
            row.original.baseQuantity == null
              ? "—"
              : `${row.original.baseQuantity} ${row.original.baseUomId ?? ""}`.trim(),
        }),
        col.accessor("basePrice", {
          header: t("basePrice"),
          meta: { className: "text-right" },
          cell: ({ row }) =>
            row.original.basePrice == null
              ? "—"
              : `${formatCurrency(row.original.basePrice, locale)} / ${row.original.baseUomId ?? ""}`.trim(),
        }),
        col.accessor("price", {
          header: t("price"),
          meta: { className: "text-right" },
          cell: ({ row }) =>
            row.original.price == null ? "—" : formatCurrency(row.original.price, locale),
        }),
      ]),
    [t, locale],
  );
}

/**
 * A sales order's items.
 */
export function SalesOrderItemTable({
  items,
  rowActions,
  emptyContent,
  bordered = true
}: {
  items: SalesOrderItemRow[];
  rowActions?: (row: SalesOrderItemRow, index: number) => ReactNode;
    emptyContent?: ReactNode;
  bordered?: boolean
}) {
  const t = useTranslations();
  const columns = useSalesOrderItemColumns();
  const params: TableParams = {
    filters: {},
    page: 1,
    pageSize: 5,
    offset: 0,
    sort: { id: "position", desc: false },
  };

  const tableConfig = defineDataTable({
    defaultSort: { id: "position", desc: false },
    sortable: ["position"],
    pageSizes: [5],
  });

  return (
    <DataTable
      columns={columns}
      data={items}
      total={items?.length ?? 0}
      params={params}
      config={tableConfig}
      manualPagination={false}
      manualSorting={false}
      rowActions={rowActions}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>{t("salesOrders.items.none")} </EmptyTitle>
            <EmptyDescription>
              {t("salesOrders.items.noneDetail")}{" "}
            </EmptyDescription>
          </EmptyHeader>
          {emptyContent && <EmptyContent>
            {emptyContent}
          </EmptyContent>}
        </Empty>
      }
    />
  );
}
