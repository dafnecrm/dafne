"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  createDataTableColumnHelper,
  DataTable,
  useDescribeFilters,
} from "@dafne/frontend-data-table/table";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { ListedCustomer } from "@/lib/customers";
import { ContactIcon } from "lucide-react";
import { CustomerTableActions } from "./customer-table-actions";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import type { TableParams } from "@dafne/frontend-data-table";
import { useOptionLabel } from "@/i18n/options";
import { customersTable, CUSTOMER_TYPE_OPTIONS } from "@/lib/customers-table";

/*
 * Columns of the customers table. Column ids double as the backend's sort
 * fields, so they must match customersTable.sortable in lib/customers-table.ts.
 */

const col = createDataTableColumnHelper<ListedCustomer>();

const empty = <span className="text-muted-foreground">—</span>;

/** Translated per language; memoized, so the table sees the same columns on every render. */
function useCustomerColumns() {
  const t = useTranslations("customers.fields");
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("id"),
          cell: ({ row }) => (
            <Link
              href={`/customers/${encodeURIComponent(row.original.id)}`}
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
              href={`/customers/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.name}
            </Link>
          ),
        }),
        col.accessor("email", {
          header: t("email"),
          cell: (info) => {
            const email = info.getValue();
            return email ? (
              <a
                href={`mailto:${email}`}
                className="underline-offset-4 hover:underline"
              >
                {email}
              </a>
            ) : (
              empty
            );
          },
        }),
        col.accessor("phone", {
          header: t("phone"),
          cell: (info) => {
            const phone = info.getValue();
            return phone ? (
              <a
                href={`tel:${phone}`}
                className="underline-offset-4 hover:underline"
              >
                {phone}
              </a>
            ) : (
              empty
            );
          },
        }),
        col.accessor("type", {
          header: t("type"),
          cell: (info) => optionLabel(CUSTOMER_TYPE_OPTIONS, info.getValue()),
        }),
        col.accessor("birthDate", {
          header: t("birthDate"),
          cell: (info) => {
            const value = info.getValue();
            return value ? <LocalDate value={value} format="date" /> : "—";
          },
        }),
        col.accessor("fiscalCode", {
          header: t("fiscalCode"),
          cell: (info) => info.getValue() ?? "—",
        }),
        col.accessor("vatNumber", {
          header: t("vatNumber"),
          cell: (info) => info.getValue() ?? "—",
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
    [t, optionLabel],
  );
}

// Module scope, so the table sees the same function on every render.
const customerActions = (customer: ListedCustomer) => (
  <CustomerTableActions customer={customer} />
);

const getRowId = (customer: ListedCustomer) => String(customer.id);

/** Customers list; the server page passes one page of customers. */
export function CustomersTable({
  customers,
  total,
  params,
}: {
  customers: ListedCustomer[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations("customers");
  const describeFilters = useDescribeFilters();
  const columns = useCustomerColumns();
  return (
    <DataTable
      columns={columns}
      data={customers}
      getRowId={getRowId}
      config={customersTable}
      rowActions={customerActions}
      params={params}
      total={total}
      noun={t("noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ContactIcon />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("empty.filtered", {
                    filter: describeFilters(
                      params.filters,
                      customersTable.filters,
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
