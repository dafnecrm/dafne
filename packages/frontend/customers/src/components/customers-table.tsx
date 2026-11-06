"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, type ReactNode } from "react";
import { ContactIcon } from "lucide-react";
import type { TableParams } from "@dafne/frontend-data-table";
import {
  createDataTableColumnHelper,
  DataTable,
  useDescribeFilters,
} from "@dafne/frontend-data-table/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { CUSTOMER_TYPE_OPTIONS } from "../customer-type-options.ts";
import type { CustomersTableConfig } from "../customers-table.ts";
import type { ListedCustomer } from "../types.ts";
import { CustomerTableActions } from "./customer-table-actions.tsx";

/*
 * Columns of the customers table. Column ids double as the backend's sort
 * fields, so they must match the sortable fields of defineCustomersTable.
 */

const col = createDataTableColumnHelper<ListedCustomer>();

const empty = <span className="text-muted-foreground">—</span>;

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Names and ids link to `<path>/<id>`, the detail page.
 */
function useCustomerColumns(path: string) {
  const t = useTranslations("customers.fields");
  const tAll = useTranslations();
  return useMemo(() => {
    const href = (id: string | number) =>
      `${path}/${encodeURIComponent(String(id))}`;
    const typeLabel = (value: string) => {
      const option = CUSTOMER_TYPE_OPTIONS.find((o) => o.value === value);
      return option ? tAll(option.label) : "—";
    };
    return col.columns([
      col.accessor("id", {
        header: t("id"),
        cell: ({ row }) => (
          <Link
            href={href(row.original.id)}
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
            href={href(row.original.id)}
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
        cell: (info) => typeLabel(info.getValue()),
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
    ]);
  }, [t, tAll, path]);
}

const getRowId = (customer: ListedCustomer) => String(customer.id);

export interface CustomersTableProps {
  /** The app's table, from defineCustomersTable. */
  config: CustomersTableConfig;
  /** One page of customers, from the server page. */
  customers: ListedCustomer[];
  total: number;
  params: TableParams;
  /**
   * Replaces the row menu (view, edit, copy email, delete). Keep the
   * function stable (module scope), so the table doesn't re-render rows.
   */
  rowActions?: (customer: ListedCustomer) => ReactNode;
}

/**
 * Customers list; the server page passes the app's config and one page of
 * customers (both plain data, so it can render this directly).
 */
export function CustomersTable({
  config,
  customers,
  total,
  params,
  rowActions,
}: CustomersTableProps) {
  const t = useTranslations("customers");
  const describeFilters = useDescribeFilters();
  const columns = useCustomerColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const defaultActions = useCallback(
    (customer: ListedCustomer) => (
      <CustomerTableActions customer={customer} path={config.path} />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={customers}
      getRowId={getRowId}
      config={config}
      rowActions={rowActions ?? defaultActions}
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
