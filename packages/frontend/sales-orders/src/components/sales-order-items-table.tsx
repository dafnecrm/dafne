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
import { CircleAlertIcon, MapPinIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { multiplyDecimal } from "@dafne/contracts";
import { formatCurrency } from "@dafne/frontend-ui/lib/currencies";
import { type ReactNode, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dafne/frontend-ui/components/tooltip";
import Link from "next/link";

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
  basePrice?: number;
  /** The item's price (the product's × the base quantity), when known. */
  price?: number;
}

const col = createDataTableColumnHelper<SalesOrderItemRow>();

/** The columns; with `productsPath`, the product links to `<productsPath>/<id>`. */
function useSalesOrderItemColumns({ productsPath }: { productsPath?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  return useMemo(
    () =>
      col.columns([
        col.accessor("position", {
          header: t("salesOrders.items.fields.position"),
          meta: { mobile: "subtitle" },
          cell: ({ row }) => row.original.position,
        }),
        col.accessor((item) => item.product?.name ?? item.productId, {
          id: "products",
          header: t("salesOrders.items.fields.productId"),
          meta: { mobile: "title" },
          cell: ({ row, getValue }) =>
            productsPath && row.original.productId != null ? (
              <Link
                href={`${productsPath}/${encodeURIComponent(row.original.productId)}`}
                className="hover:underline"
              >
                {getValue()}
              </Link>
            ) : (
              getValue()
            ),
        }),
        col.accessor("quantity", {
          header: t("salesOrders.items.fields.quantity"),
          cell: ({ row }) =>
            [row.original.quantity, row.original.uomId].filter((part) => part != null && part !== "").join(" "),
        }),
        col.accessor("baseQuantity", {
          header: t("salesOrders.items.fields.baseQuantity"),
          cell: ({ row }) =>
            row.original.baseQuantity == null
              ? "—"
              : `${row.original.baseQuantity} ${row.original.baseUomId ?? ""}`.trim(),
        }),
        col.accessor("basePrice", {
          header: t("salesOrders.items.fields.basePrice"),
          meta: { className: "text-right" },
          cell: ({ row }) =>
            row.original.basePrice == null
              ? "—"
              : `${formatCurrency(row.original.basePrice, locale)} / ${row.original.baseUomId ?? ""}`.trim(),
        }),
        col.accessor("price", {
          header: t("salesOrders.items.fields.price"),
          meta: { className: "text-right", mobile: "aside" },
          cell: ({ row }) => row.original.price == null
            ? "—"
            : <div className="flex items-center justify-end gap-2">
              {/* The kept price differs from today's (the product's price changed). */}
              {row.original.basePrice != null &&
                row.original.baseQuantity != null &&
                multiplyDecimal(row.original.basePrice, row.original.baseQuantity, 2) !== row.original.price && (
                  <Tooltip>
                    <TooltipTrigger>
                      <CircleAlertIcon className="size-4 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("salesOrders.items.priceNeedsRecaulation")}
                    </TooltipContent>
                  </Tooltip>
                )}
              {formatCurrency(row.original.price, locale)}
            </div>
        }),
      ]),
    [t, locale, productsPath],
  );
}

/**
 * A sales order's items. With `productsPath` (the app's products list),
 * each product links to its page.
 */
export function SalesOrderItemTable({
  items,
  rowActions,
  emptyContent,
  productsPath
}: {
  items: SalesOrderItemRow[];
  rowActions?: (row: SalesOrderItemRow, index: number) => ReactNode;
  emptyContent?: ReactNode;
  productsPath?: string
}) {
  const t = useTranslations();
  const columns = useSalesOrderItemColumns({ productsPath });
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
