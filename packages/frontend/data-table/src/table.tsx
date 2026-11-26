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
  ListFilterIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useMemo,
  useState,
  useTransition,
  type ComponentType,
  type ReactNode,
} from "react";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@dafne/frontend-ui/components/drawer";
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
import { cn } from "@dafne/frontend-ui/lib/utils";

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
 * In a narrow container (below 42rem: a phone, or a sheet) each row is a
 * card instead. `meta.mobile` says where a column goes in it: "title",
 * "subtitle", "aside" (bottom right: dates, amounts), "field" (a label and
 * its value, the default) or "hidden". Without a "title", the first
 * "field" is the title. The sort is a select, the filters a drawer.
 *
 *   col.accessor("name", { header: "Name", meta: { mobile: "title" } }),
 *   col.accessor("id", { header: "Id", meta: { mobile: "subtitle" } }),
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
    /** Where the column goes in the mobile card; "field" by default. */
    mobile?: DataTableMobileRole;
  },
});

/** Where a column goes in the mobile card (see DataTable). */
export type DataTableMobileRole =
  | "title"
  | "subtitle"
  | "aside"
  | "field"
  | "hidden";

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
        if (!value) {
          return [];
        }
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
  render: (row: TData, index: number) => ReactNode,
): DataTableColumnDef<TData> {
  return createDataTableColumnHelper<TData>().display({
    id: "actions",
    header: () => <ActionsHeader />,
    enableSorting: false,
    meta: { className: "w-0 text-right" },
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        {render(row.original, row.index)}
      </div>
    ),
  });
}

/** A column, as far as the mobile card cares. */
interface MobileColumn {
  id: string;
  columnDef: { meta?: { mobile?: DataTableMobileRole } };
}

/** The card's title: the "title" column, else the first "field" one. */
function titleColumnId(columns: MobileColumn[]): string | undefined {
  const role = (c: MobileColumn) => c.columnDef.meta?.mobile ?? "field";
  return (
    columns.find((c) => role(c) === "title") ??
    columns.find((c) => c.id !== "actions" && role(c) === "field")
  )?.id;
}

/** A field's label in the card: the header when it's text, else the id. */
function headerLabel(header: unknown, id: string): string {
  return typeof header === "string" ? header : id;
}

/**
 * The sort on mobile, where there are no headers to click: one select with
 * each sortable column, ascending and descending.
 */
function DataTableMobileSort({
  columns,
  sort,
  disabled,
  onChange,
}: {
  columns: { id: string; label: string }[];
  sort: { id: string; desc: boolean } | undefined;
  disabled?: boolean;
  onChange: (sort: { id: string; desc: boolean }) => void;
}) {
  const t = useTranslations("dataTable");
  const items = columns.flatMap(({ id, label }) => [
    { value: `${id}:asc`, label: t("sortAsc", { label }) },
    { value: `${id}:desc`, label: t("sortDesc", { label }) },
  ]);
  return (
    <Select
      items={items}
      value={sort ? `${sort.id}:${sort.desc ? "desc" : "asc"}` : null}
      onValueChange={(value) => {
        if (!value) {
          return;
        }
        const at = value.lastIndexOf(":");
        onChange({ id: value.slice(0, at), desc: value.slice(at + 1) === "desc" });
      }}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="self-start" aria-label={t("sortBy")}>
        <ArrowUpDownIcon data-icon="inline-start" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Props of a custom filter control (see `DataTableFilterControls`). */
export interface DataTableFilterControlProps {
  /** The filter's text, as in the URL; "" when not set. */
  value: string;
  onValueChange: (value: string) => void;
  /** The filter's label, translated: use it as the control's aria-label. */
  label: string;
  /** The filter's placeholder, translated. */
  placeholder: string;
  disabled?: boolean;
}

export type DataTableFilterControl = ComponentType<DataTableFilterControlProps>;

/**
 * Custom filter controls by filter field, replacing the text box or
 * combobox, e.g. `{ customerId: CustomerFilter }`. They come from the
 * client table, not the config: the config is plain data the server page
 * passes to the client, and components can't cross that boundary. Keep
 * stable (module scope).
 */
export type DataTableFilterControls = Readonly<
  Record<string, DataTableFilterControl>
>;

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
   * `index` is the row's position in `data` (the current page).
   */
  rowActions?: (row: TData, index: number) => ReactNode;
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
  /** Custom controls for some filters, by field. Keep stable. */
  filterControls?: DataTableFilterControls;
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

  bordered?: boolean;
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
  filterControls,
  noun,
  manualPagination = true,
  manualSorting = true,
  bordered = true,
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
        if (manualPagination) {
          navigate(tableHref(config, { ...params, page: 1 }));
        } else {
          setLocalPagination((current) => ({ ...current, pageIndex: 0 }));
        }
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = Object.keys(params.filters).length;
  const filterBar = (stacked: boolean) => (
    <DataTableFilters
      // Reset the inputs when the URL's filters change (e.g. Back).
      key={JSON.stringify(params.filters)}
      filters={config.filters}
      controls={filterControls}
      active={params.filters}
      disabled={navigating}
      stacked={stacked}
      onChange={(next) => {
        setFiltersOpen(false);
        // New filters start again from page 1.
        navigate(tableHref(config, { ...params, filters: next, page: 1 }));
      }}
    />
  );
  const sortable = table.getAllLeafColumns().filter((c) => c.getCanSort());
  const title = titleColumnId(table.getAllLeafColumns());

  /*
   * The table and the cards are both rendered, and a container query shows
   * one: no flash on phones (the server can't know the width), and cards in
   * narrow containers on desktop too (a sheet, a detail section).
   */
  return (
    <div className="@container flex flex-col gap-4">
      {config.filters.length > 0 && rows.length > 0 && (
        <>
          <div className="hidden @2xl:block">{filterBar(false)}</div>
          <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="flex items-center gap-2 @2xl:hidden">
              <Button
                variant="outline"
                size="sm"
                disabled={navigating}
                onClick={() => setFiltersOpen(true)}
              >
                <ListFilterIcon data-icon="inline-start" />
                {activeFilters
                  ? t("filtersActive", { count: activeFilters })
                  : t("filters")}
              </Button>
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={navigating}
                  onClick={() =>
                    navigate(
                      tableHref(config, { ...params, filters: {}, page: 1 }),
                    )
                  }
                >
                  <XIcon data-icon="inline-start" />
                  {t("clear")}
                </Button>
              )}
            </div>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{t("filters")}</DrawerTitle>
                <DrawerDescription className="sr-only">
                  {t("filters")}
                </DrawerDescription>
              </DrawerHeader>
              <div className="overflow-y-auto p-4">{filterBar(true)}</div>
            </DrawerContent>
          </Drawer>
        </>
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
          <>
          <div className={cn('hidden @2xl:block overflow-hidden [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4', bordered && 'rounded-lg border')}>
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
        <div className="flex flex-col gap-2 @2xl:hidden">
          {sortable.length > 0 && (
            <DataTableMobileSort
              columns={sortable.map((c) => ({
                id: c.id,
                label:
                  typeof c.columnDef.header === "string"
                    ? c.columnDef.header
                    : c.id,
              }))}
              sort={sorting[0]}
              disabled={navigating}
              onChange={(next) => table.setSorting([next])}
            />
          )}
          <ul
            aria-busy={navigating}
            className={cn(
              "flex flex-col gap-2",
              navigating && "opacity-60 transition-opacity",
            )}
          >
            {rows.map((row) => {
              const cells = row.getAllCells();
              const of = (role: DataTableMobileRole) =>
                cells.filter(
                  (c) =>
                    c.column.id !== "actions" &&
                    c.column.id !== title &&
                    (c.column.columnDef.meta?.mobile ?? "field") === role,
                );
              const titleCell = cells.find((c) => c.column.id === title);
              const actions = cells.find((c) => c.column.id === "actions");
              const subtitles = of("subtitle");
              const fields = of("field");
              const asides = of("aside");
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {titleCell && (
                        <div className="truncate font-medium">
                          <table.FlexRender cell={titleCell} />
                        </div>
                      )}
                      {subtitles.length > 0 && (
                        <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                          {subtitles.map((cell) => (
                            <span key={cell.id}>
                              <table.FlexRender cell={cell} />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {actions && (
                      <div className="-mt-1 -mr-1 flex shrink-0 gap-1">
                        <table.FlexRender cell={actions} />
                      </div>
                    )}
                  </div>
                  {fields.length > 0 && (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      {fields.map((cell) => (
                        <Fragment key={cell.id}>
                          <dt className="text-muted-foreground">
                            {headerLabel(cell.column.columnDef.header, cell.column.id)}
                          </dt>
                          <dd className="min-w-0 break-words">
                            <table.FlexRender cell={cell} />
                          </dd>
                        </Fragment>
                      ))}
                    </dl>
                  )}
                  {asides.length > 0 && (
                    <div className="flex flex-wrap items-center justify-end gap-x-3 font-medium text-xs">
                      {asides.map((cell) => (
                        <span key={cell.id}>
                          <table.FlexRender cell={cell} />
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        </>
      )}

      {rows.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          {count
            ? t("range", { first, last, total: count, unit })
            : t("none", { unit })}
          {navigating && <Spinner />}
        </span>
        <div className="flex items-center gap-2">
          {config.pageSizes.length > 1 && (
            <div className="hidden @2xl:block">
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
            </div>
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
 * Filter bar: one control per filter (its custom control from `controls`,
 * else a combobox when the filter has `options`, else a text box). They
 * combine with AND. Applying or clearing calls `onChange`; the table puts
 * the filters in the URL.
 *
 *   const controls: DataTableFilterControls = {
 *     customerId: ({ value, onValueChange, label, placeholder }) => (
 *       <CustomerSelect value={value} onValueChange={onValueChange}
 *         aria-label={label} placeholder={placeholder} />
 *     ),
 *   };
 *   <DataTable filterControls={controls} … />
 */
export function DataTableFilters({
  filters,
  controls,
  active,
  disabled,
  stacked = false,
  onChange,
}: {
  filters: readonly TableFilterDef[];
  controls?: DataTableFilterControls;
  active: TableFilters;
  disabled?: boolean;
  /** One control per line, full width (the mobile drawer). */
  stacked?: boolean;
  onChange: (filters: TableFilters) => void;
}) {
  const [values, setValues] = useState<TableFilters>(active);
  const t = useTranslations();
  // Options with their label translated: the combobox shows and filters it.
  const optionsOf = (def: TableFilterDef) =>
    def.options?.map((o) => ({ value: o.value, label: t(o.label) }));
  const set = (field: string, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  // "Any customer"-style placeholder, for pickers.
  const pickPlaceholder = (def: TableFilterDef) =>
    def.placeholder
      ? t(def.placeholder)
      : t("dataTable.any", { label: t(def.label).toLowerCase() });

  return (
    <form
      className={cn(
        "flex gap-2",
        stacked
          ? "flex-col items-stretch *:w-full [&_input]:w-full"
          : "flex-wrap items-center",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onChange(values);
      }}
    >
      {filters.map((def) => {
        const Control = controls?.[def.field];
        if (Control) {
          return (
            <Control
              key={def.field}
              value={values[def.field] ?? ""}
              onValueChange={(value) => set(def.field, value)}
              label={t(def.label)}
              placeholder={pickPlaceholder(def)}
              disabled={disabled}
            />
          );
        }
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
              className={stacked ? "w-full" : "w-40"}
              placeholder={pickPlaceholder(def)}
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
            className={stacked ? "w-full" : "w-52"}
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
