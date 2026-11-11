"use client";

import { useCallback, useMemo } from "react";
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
import type { ProductsTableConfig } from "../products-table.ts";
import type { ListedProduct } from "../types.ts";
import { ProductTableActions } from "./product-table-actions.tsx";
import { formatCurrency } from "@dafne/frontend-ui/lib/currencies";

/*
 * Columns of the products table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../products-table.ts.
 */

const col = createDataTableColumnHelper<ListedProduct>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Names and ids link to `<path>/<id>`, the detail page.
 */
function useProductColumns(path: string) {
  const t = useTranslations("products.fields");
  const locale = useLocale();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("name", {
          header: t("name"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
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
              className="text-muted-foreground tabular-nums font-medium"
              format="dateTime"
            />
          ),
        }),
      ]),
    [t, locale, path],
  );
}

const getRowId = (product: ListedProduct) => String(product.id);

/**
 * Products list; the server page passes the app's config and one page of
 * products.
 */
export function ProductsTable({
  config,
  products,
  total,
  params,
}: {
  config: ProductsTableConfig;
  products: ListedProduct[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations("products");
  const describeFilters = useDescribeFilters();
  const columns = useProductColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const productActions = useCallback(
    (product: ListedProduct) => (
      <ProductTableActions product={product} path={config.path} />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={products}
      getRowId={getRowId}
      config={config}
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
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
