"use client";

import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  FilterIcon,
  InboxIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@dafne/frontend-ui/components/combobox";
import { Input } from "@dafne/frontend-ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dafne/frontend-ui/components/select";
import { Spinner } from "@dafne/frontend-ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dafne/frontend-ui/components/table";
import {
  tableHref,
  type DataTableConfig,
  type TableFilterDef,
  type TableFilters,
  type TableParams,
} from "./data-table.ts";

/*
 * Generic data table on TanStack Table v9, for server-paginated lists.
 * Each table has a config (defineDataTable in lib/data-table.ts: path, page
 * sizes, sort and filter fields). The server fetches one sorted page;
 * filters, page, page size and sort live in the URL, and the table
 * navigates when they change. Columns are sortable by default; set
 * `enableSorting: false` on columns the backend can't sort by.
 *
 * Column definitions contain functions, so define them in a client component:
 *
 *   const col = createDataTableColumnHelper<User>();
 *   const columns = col.columns([
 *     col.accessor("email", { header: "Email" }),
 *     col.accessor("createdAt", {
 *       header: "Joined",
 *       meta: { className: "text-right" },
 *       cell: (info) => formatDate(info.getValue()),
 *     }),
 *   ]);
 *
 * Row actions (a button, a dropdown…) go in a last column via `rowActions`:
 *
 *   const userActions = (user: User) => (
 *     <Button size="sm" variant="ghost">Edit</Button>
 *   );
 *   <DataTable rowActions={userActions} … />
 */

/** Features shared by every data table. Module scope: must stay stable. */
export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  // Client-side pagination and sorting, used only when `manualPagination`
  // or `manualSorting` is false.
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  // The ones `sortFn: "auto"` (the default) picks from.
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  // Type-only slot: per-column options read by DataTable.
  columnMeta: {} as {
    /** Classes for the header and the cells, e.g. "text-right". */
    className?: string;
  },
});

export type DataTableFeatures = typeof dataTableFeatures;
/** A column of any value type (what `columnHelper.columns()` returns). */
export type DataTableColumnDef<TData extends RowData> = ReturnType<
  ReturnType<typeof createColumnHelper<DataTableFeatures, TData>>["columns"]
>[number];

/** Typed column helper for DataTable columns. */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

/**
 * Describes the active filters, e.g. `Email contains “ada” and Role is
 * “Admin”`, in the user's language. Empty when no filter is active.
 */
export function useDescribeFilters() {
  const t = useTranslations();
  return (active: TableFilters, filters: readonly TableFilterDef[]) =>
    filters
      .flatMap((def) => {
        const value = active[def.field];
        if (!value) return [];
        const label = t(def.label);
        const option = def.options?.find((o) => o.value === value);
        return option
          ? t("dataTable.filterIs", { label, value: t(option.label) })
          : t("dataTable.filterContains", { label, value });
      })
      .join(t("dataTable.and"));
}

function ActionsHeader() {
  const t = useTranslations("dataTable");
  return <span className="sr-only">{t("actions")}</span>;
}

/** The column `rowActions` adds: not sortable, as narrow as its content. */
function actionsColumn<TData extends RowData>(
  render: (row: TData) => ReactNode,
): DataTableColumnDef<TData> {
  return createDataTableColumnHelper<TData>().display({
    id: "actions",
    header: () => <ActionsHeader />,
    enableSorting: false,
    meta: { className: "w-0 text-right" },
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">{render(row.original)}</div>
    ),
  });
}

export interface DataTableProps<TData extends RowData> {
  /** Keep stable (module scope or useMemo). */
  columns: DataTableColumnDef<TData>[];
  /** The current page of rows, as returned by the server. */
  data: TData[];
  /** Row key; defaults to the row index. */
  getRowId?: (row: TData, index: number) => string;
  /** The table's config, shared with the server page. */
  config: DataTableConfig;
  /** The current view, from getTableParams on the server. */
  params: TableParams;
  /** Total rows across all pages. */
  total: number;
  /**
   * Content of a last, right-aligned "Actions" column for each row, e.g. a
   * button or a dropdown menu. No column when unset. Keep stable.
   */
  rowActions?: (row: TData) => ReactNode;
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
  /** Unit for the count, already translated, e.g. "users" ("1–20 of 42 users"). */
  noun?: string;
  /**
   * Paginate on the server (default): `data` is one page, and changing page
   * or page size changes the URL and fetches again. When false, `data` holds
   * every row and the table pages through it in the browser, without
   * calling the server.
   */
  manualPagination?: boolean;
  /**
   * Sort on the server (default): a click changes the sort in the URL and
   * the page is fetched again. When false, the table sorts the rows it has
   * in the browser, without calling the server.
   */
  manualSorting?: boolean;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  config,
  params,
  total,
  rowActions,
  empty,
  noun,
  manualPagination = true,
  manualSorting = true,
}: DataTableProps<TData>) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const t = useTranslations("dataTable");
  const describeFilters = useDescribeFilters();

  // The URL owns page and sort; the table only asks to change them.
  // Client-side pagination and sorting live here instead, starting from
  // the URL's (the order the server returned the rows in).
  const urlPagination = useMemo<PaginationState>(
    () => ({ pageIndex: params.page - 1, pageSize: params.pageSize }),
    [params.page, params.pageSize],
  );
  const [localPagination, setLocalPagination] = useState<PaginationState>(
    () => ({ pageIndex: 0, pageSize: params.pageSize }),
  );
  const pagination = manualPagination ? urlPagination : localPagination;
  const urlSorting = useMemo<SortingState>(() => [params.sort], [params.sort]);
  const [localSorting, setLocalSorting] = useState<SortingState>(urlSorting);
  const sorting = manualSorting ? urlSorting : localSorting;
  const navigate = (href: string) => startTransition(() => router.push(href));

  const allColumns = useMemo(
    () => (rowActions ? [...columns, actionsColumn(rowActions)] : columns),
    [columns, rowActions],
  );

  const table = useTable({
    features: dataTableFeatures,
    columns: allColumns,
    data,
    getRowId,
    // The server already returned this page, sorted (unless manualPagination
    // or manualSorting is false).
    manualPagination,
    manualSorting,
    // Client-side, the count comes from the rows.
    rowCount: manualPagination ? total : undefined,
    enableMultiSort: false,
    enableSortingRemoval: false, // a click toggles asc / desc
    state: { pagination, sorting },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      // A new page size starts again from page 1.
      const samePageSize = next.pageSize === pagination.pageSize;
      if (!manualPagination) {
        setLocalPagination(samePageSize ? next : { ...next, pageIndex: 0 });
        return;
      }
      const page = samePageSize ? next.pageIndex + 1 : 1;
      navigate(tableHref(config, { ...params, pageSize: next.pageSize, page }));
    },
    onSortingChange: (updater) => {
      if (!manualSorting) {
        setLocalSorting(updater);
        // A new order starts again from page 1.
        if (manualPagination) navigate(tableHref(config, { ...params, page: 1 }));
        else setLocalPagination((current) => ({ ...current, pageIndex: 0 }));
        return;
      }
      const [next] = typeof updater === "function" ? updater(sorting) : updater;
      // A new order starts again from page 1.
      navigate(
        tableHref(config, {
          ...params,
          sort: next ?? config.defaultSort,
          page: 1,
        }),
      );
    },
  });

  const rows = table.getRowModel().rows;
  // `total`, or every row client-side.
  const count = table.getRowCount();
  const first = count ? pagination.pageIndex * pagination.pageSize + 1 : 0;
  const last = Math.min(first + rows.length - 1, count);
  const unit = noun ?? t("results");

  return (
    <div className="flex flex-col gap-4">
      {config.filters.length > 0 && rows.length > 0 && (
        <DataTableFilters
          // Reset the inputs when the URL's filters change (e.g. Back).
          key={JSON.stringify(params.filters)}
          filters={config.filters}
          active={params.filters}
          disabled={navigating}
          onChange={(next) =>
            // New filters start again from page 1.
            navigate(tableHref(config, { ...params, filters: next, page: 1 }))
          }
        />
      )}

      {rows.length === 0 ? (
        (empty ?? (
          <DataTableEmpty
            filter={
              describeFilters(params.filters, config.filters) || undefined
            }
          />
        ))
      ) : (
        <div className="overflow-hidden rounded-lg border [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <Table aria-busy={navigating}>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        className={header.column.columnDef.meta?.className}
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : undefined
                        }
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-mx-2.5 data-[sorted=false]:text-muted-foreground"
                            data-sorted={Boolean(sorted)}
                            disabled={navigating}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <table.FlexRender header={header} />
                            {sorted === "asc" ? (
                              <ArrowUpIcon data-icon="inline-end" />
                            ) : sorted === "desc" ? (
                              <ArrowDownIcon data-icon="inline-end" />
                            ) : (
                              <ArrowUpDownIcon data-icon="inline-end" />
                            )}
                          </Button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody
              className={
                navigating ? "opacity-60 transition-opacity" : undefined
              }
            >
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.columnDef.meta?.className}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {rows.length > 0 && <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          {count
            ? t("range", { first, last, total: count, unit })
            : t("none", { unit })}
          {navigating && <Spinner />}
        </span>
        <div className="flex items-center gap-2">
          {config.pageSizes.length > 1 && (
            <Select
              items={config.pageSizes.map((size) => ({
                value: size,
                label: t("perPage", { size }),
              }))}
              value={pagination.pageSize}
              onValueChange={(size) => size && table.setPageSize(size)}
              disabled={navigating}
            >
              <SelectTrigger size="sm" aria-label={t("rowsPerPage")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config.pageSizes.map((size) => (
                  <SelectItem key={size} value={size}>
                    {t("perPage", { size })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage() || navigating}
            onClick={() => table.previousPage()}
          >
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage() || navigating}
            onClick={() => table.nextPage()}
          >
            {t("next")}
          </Button>
        </div>
      </div>}
    </div>
  );
}

/**
 * Filter bar: one control per filter (a text box, or a combobox when the
 * filter has `options`). They combine with AND. Applying or clearing calls
 * `onChange`; the table puts the filters in the URL.
 */
export function DataTableFilters({
  filters,
  active,
  disabled,
  onChange,
}: {
  filters: readonly TableFilterDef[];
  active: TableFilters;
  disabled?: boolean;
  onChange: (filters: TableFilters) => void;
}) {
  const [values, setValues] = useState<TableFilters>(active);
  const t = useTranslations();
  // Options with their label translated: the combobox shows and filters it.
  const optionsOf = (def: TableFilterDef) =>
    def.options?.map((o) => ({ value: o.value, label: t(o.label) }));
  const set = (field: string, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(values);
      }}
    >
      {filters.map((def) => {
        const options = optionsOf(def);
        return options ? (
          <Combobox
            key={def.field}
            items={options}
            // Items are { value, label }, so the input shows the label.
            value={options.find((o) => o.value === values[def.field]) ?? null}
            onValueChange={(option) => set(def.field, option?.value ?? "")}
          >
            <ComboboxInput
              className="w-40"
              placeholder={
                def.placeholder
                  ? t(def.placeholder)
                  : t("dataTable.any", { label: t(def.label).toLowerCase() })
              }
              aria-label={t(def.label)}
              showClear={Boolean(values[def.field])}
            />
            <ComboboxContent>
              <ComboboxEmpty>{t("dataTable.noMatches")}</ComboboxEmpty>
              <ComboboxList>
                {(option: { value: string; label: string }) => (
                  <ComboboxItem key={option.value} value={option}>
                    {option.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        ) : (
          <Input
            key={def.field}
            type="search"
            className="w-52"
            value={values[def.field] ?? ""}
            onChange={(event) => set(def.field, event.target.value)}
            placeholder={t(def.placeholder ?? def.label)}
            aria-label={t(def.label)}
          />
        );
      })}

      <Button type="submit" variant="default" disabled={disabled}>
        <FilterIcon data-icon="inline-start" />
        {t("dataTable.filter")}
      </Button>
      {Object.keys(active).length > 0 && (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange({})}
        >
          <XIcon data-icon="inline-start" />
          {t("dataTable.clear")}
        </Button>
      )}
    </form>
  );
}

/** Default empty state. */
/** `filter` describes the active filters (see describeFilters). */
export function DataTableEmpty({ filter }: { filter?: string }) {
  const t = useTranslations("dataTable");
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>{t("noResults")}</EmptyTitle>
        <EmptyDescription>
          {filter ? t("nothingWhere", { filter }) : t("nothingYet")}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
