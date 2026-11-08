'use client';

import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import { defineDataTable, TableParams } from "@dafne/frontend-data-table";
import { createDataTableColumnHelper, DataTable } from "@dafne/frontend-data-table/table";
import { Button } from "@dafne/frontend-ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@dafne/frontend-ui/components/empty";
import { MapPinIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";
import { SalesOrderItem } from "@dafne/contracts";

const col = createDataTableColumnHelper<SalesOrderItem>();

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
          (item) => item.productId,
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
  path
}: {
  salesOrderId: number,
  items: SalesOrderItem[],
  path: string
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