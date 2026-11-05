"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileIcon } from "lucide-react";
import Link from "next/link";
import {
  createDataTableColumnHelper,
  useDescribeFilters,
  DataTable,
} from "@dafne/frontend-data-table/table";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import type { TableParams } from "@dafne/frontend-data-table";
import type { ListedProduct } from "@/lib/products";
import { productsTable } from "@/lib/products-table";
import { ProductTableActions } from "./product-table-actions";
import { formatCurrency } from "@/lib/currencies";

/*
 * Columns of the products table. Column ids double as the backend's
 * sort fields, so they must match productsTable.sortable in
 * lib/products-table.ts.
 */

const col = createDataTableColumnHelper<ListedProduct>();

/** Translated per language; memoized, so the table sees the same columns on every render. */
function useProductColumns() {
  const t = useTranslations("products.fields");
  const locale = useLocale();
  return useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: t("name"),
          cell: ({ row }) => (
            <Link
              href={`/products/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.name}
            </Link>
          ),
        }),
        col.accessor("price", {
          header: t("price"),
          cell: (info) => formatCurrency(info.getValue(), locale),
        }),
        col.accessor("createdAt", {
          header: t("createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground"
            />
          ),
        }),
      ]),
    [t, locale],
  );
}

// Module scope, so the table sees the same function on every render.
const productActions = (product: ListedProduct) => (
  <ProductTableActions product={product} />
);

const getRowId = (product: ListedProduct) => product.id;

/** Products list; the server page passes one page of products. */
export function ProductsTable({
  products,
  total,
  params,
}: {
  products: ListedProduct[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations("products");
  const describeFilters = useDescribeFilters();
  const columns = useProductColumns();
  return (
    <DataTable
      columns={columns}
      data={products}
      getRowId={getRowId}
      config={productsTable}
      rowActions={productActions}
      params={params}
      total={total}
      noun={t("noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileIcon />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("empty.filtered", {
                    filter: describeFilters(
                      params.filters,
                      productsTable.filters,
                    ),
                  })
                : t("empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
