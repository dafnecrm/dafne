"use client";

import { PackageIcon, RotateCw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { SalesOrderSortField } from "@dafne/contracts";
import { defineDataTable, type TableParams } from "@dafne/frontend-data-table";
import { DataTable } from "@dafne/frontend-data-table/table";
import {
  Alert,
  AlertAction,
  AlertDescription,
} from "@dafne/frontend-ui/components/alert";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail-section";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import { Spinner } from "@dafne/frontend-ui/components/spinner";
import { getCustomerSalesOrders } from "../actions.ts";
import { SALES_ORDERS_DEFAULT_SORT } from "../sales-orders-table.ts";
import type { SalesOrdersList } from "../types.ts";
import { useSalesOrderColumns } from "./sales-orders-table.tsx";
import { SalesOrderTableActions } from "./sales-order-table-actions.tsx";

/** The newest orders the section loads; the table pages through them. */
const LIMIT = 5;

/*
 * Paged and sorted in the browser (no path: the URL is the customer's
 * page), over the newest LIMIT orders; "View all" opens the full list.
 */
const config = defineDataTable({
  pageSizes: [5],
  sortable: ["id", "status", "createdAt"] satisfies SalesOrderSortField[],
  defaultSort: SALES_ORDERS_DEFAULT_SORT,
});

const params: TableParams = {
  filters: {},
  page: 1,
  pageSize: 5,
  offset: 0,
  sort: SALES_ORDERS_DEFAULT_SORT,
};

/**
 * A customer's sales orders, for their page: loaded the first time the
 * section opens. `path` is the app's sales orders list (the ids link to
 * `<path>/<id>`, "View all" to the list filtered by the customer).
 */
export function CustomerSalesOrdersDetailSection({
  customerId,
  path,
}: {
  customerId: number;
  path: string;
}) {
  const t = useTranslations("salesOrders.customerSection");
  const columns = useSalesOrderColumns({ path });
  const [page, setPage] = useState<SalesOrdersList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await getCustomerSalesOrders(customerId, {
          limit: LIMIT,
          offset: 0,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setPage(result);
      } catch {
        setError(t("loadError"));
      }
    });
  };

  const listHref = `${path}?${new URLSearchParams({ customerId: String(customerId) })}`;
  const createHref = `${path}/new?${new URLSearchParams({ customerId: String(customerId) })}`;
  const detailHref = (salesOrderId: number) => `${path}/${String(salesOrderId)}`
  const editHref = (salesOrderId: number) => `${path}/${String(salesOrderId)}/edit`

  return (
    <DetailSection
      title={t("title", { limit: LIMIT })}
      defaultOpen={false}
      onOpenChange={(open) => {
        if (open && !page && !pending) {
          load();
        }
      }}
      actions={<div className="flex items-center gap-2">
        {page && <Button
          variant="outline"
          size="icon-xs"
          onClick={() => load()}
        >
          <RotateCw />
        </Button>}
        {page && page.total > page.items.length ? (
          <Button
            variant="outline"
            size="xs"
            nativeButton={false}
            render={<Link href={listHref} />}
          >
            {t("viewAll", { count: page.total })}
          </Button>
        ) : null}
        {page && <Button
          variant="outline"
          size="xs"
          nativeButton={false}
          render={<Link href={createHref} />}
        >
          {t("new")}
        </Button>}
      </div>}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="xs" onClick={load}>
              {t("retry")}
            </Button>
          </AlertAction>
        </Alert>
      ) : pending || !page ? (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Spinner />
          {t("loading")}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={page.items}
          total={page.items.length}
          config={config}
          params={params}
          manualPagination={false}
          manualSorting={false}
          empty={
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageIcon />
                </EmptyMedia>
                <EmptyTitle>{t("empty.title")}</EmptyTitle>
                <EmptyDescription>{t("empty.description")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
          rowActions={(row) => <SalesOrderTableActions path={path} salesOrder={row} />}
        />
      )}
    </DetailSection>
  );
}
