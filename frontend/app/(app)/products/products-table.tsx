"use client";

import { FileIcon } from "lucide-react";
import Link from "next/link";
import {
  createDataTableColumnHelper,
  DataTable,
} from "@/components/data-table";
import { LocalDate } from "@/components/local-date";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { describeFilters, type TableParams } from "@/lib/data-table";
import type { ListedProduct } from "@/lib/products";
import { productsTable } from "@/lib/products-table";
import { ProductTableActions } from "./product-table-actions";

/*
 * Columns of the products table. Column ids double as the backend's
 * sort fields, so they must match productsTable.sortable in
 * lib/products-table.ts.
 */

const col = createDataTableColumnHelper<ListedProduct>();

// Module scope, so the table sees the same columns on every render.
const productColumns = col.columns([
  col.accessor("name", {
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/products/${encodeURIComponent(row.original.id)}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  }),
  col.accessor("price", { header: "Price" }),
  col.accessor("createdAt", {
    header: "Added",
    meta: { className: "text-right" },
    cell: (info) => (
      <LocalDate value={info.getValue()} className="text-muted-foreground" />
    ),
  }),
]);

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
  return (
    <DataTable
      columns={productColumns}
      data={products}
      getRowId={getRowId}
      config={productsTable}
      rowActions={productActions}
      params={params}
      total={total}
      noun="products"
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileIcon />
            </EmptyMedia>
            <EmptyTitle>No products found</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? `No product where ${describeFilters(params.filters, productsTable.filters)}.`
                : "Add your first product to get started."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
