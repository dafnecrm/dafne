"use client";

import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
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
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  tableHref,
  type TableFilters,
  type TableParams,
} from "@/lib/data-table";

/*
 * Generic data table on TanStack Table v9, for server-paginated lists.
 * The server fetches one sorted page; filters (?email=…), page (?page=) and sort
 * (?sort=&dir=) live in the URL (see lib/data-table.ts), and the table
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
 */

/** Features shared by every data table. Module scope: must stay stable. */
export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
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
 * A field the table can be filtered by. With `options` the value is picked
 * from a list (the backend matches it exactly); without, it's typed in.
 */
export interface DataTableFilterDef {
  /** Backend filter field, e.g. "email". */
  field: string;
  label: string;
  placeholder?: string;
  options?: readonly { value: string; label: string }[];
}

/**
 * Human-readable filters, e.g. `Email contains “ada” and Role is “Admin”`.
 * Empty when no filter is active.
 */
export function describeFilters(
  active: TableFilters,
  filters: readonly DataTableFilterDef[],
) {
  return filters
    .flatMap((def) => {
      const value = active[def.field];
      if (!value) return [];
      const option = def.options?.find((o) => o.value === value);
      return option
        ? `${def.label} is “${option.label}”`
        : `${def.label} contains “${value}”`;
    })
    .join(" and ");
}

export interface DataTableProps<TData extends RowData> {
  /** Keep stable (module scope or useMemo). */
  columns: DataTableColumnDef<TData>[];
  /** The current page of rows, as returned by the server. */
  data: TData[];
  /** Row key; defaults to the row index. */
  getRowId?: (row: TData, index: number) => string;
  /** Page path, used for filter, sort and paging URLs. */
  path: string;
  params: TableParams;
  /** Total rows across all pages. */
  total: number;
  /** Fields to filter by; shows the filter bar when not empty. Keep stable. */
  filters?: readonly DataTableFilterDef[];
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
  /** Unit for the count, e.g. "users" ("1–20 of 42 users"). */
  noun?: string;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  path,
  params,
  total,
  filters,
  empty,
  noun,
}: DataTableProps<TData>) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();

  // The URL owns page and sort; the table only asks to change them.
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: params.page - 1, pageSize: params.pageSize }),
    [params.page, params.pageSize],
  );
  const sorting = useMemo<SortingState>(() => [params.sort], [params.sort]);
  const navigate = (href: string) => startTransition(() => router.push(href));

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    // The server already returned this page, sorted.
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
    enableMultiSort: false,
    enableSortingRemoval: false, // a click toggles asc / desc
    state: { pagination, sorting },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      navigate(tableHref(path, { ...params, page: next.pageIndex + 1 }));
    },
    onSortingChange: (updater) => {
      const [next] = typeof updater === "function" ? updater(sorting) : updater;
      // A new order starts again from page 1.
      navigate(
        tableHref(path, {
          ...params,
          sort: next ?? params.defaultSort,
          page: 1,
        }),
      );
    },
  });

  const rows = table.getRowModel().rows;
  const first = total ? pagination.pageIndex * pagination.pageSize + 1 : 0;
  const last = Math.min(first + rows.length - 1, total);
  const unit = noun ? ` ${noun}` : "";

  return (
    <div className="flex flex-col gap-4">
      {filters && filters.length > 0 && (
        <DataTableFilters
          // Reset the inputs when the URL's filters change (e.g. Back).
          key={JSON.stringify(params.filters)}
          filters={filters}
          active={params.filters}
          disabled={navigating}
          onChange={(next) =>
            // New filters start again from page 1.
            navigate(tableHref(path, { ...params, filters: next, page: 1 }))
          }
        />
      )}

      {rows.length === 0 ? (
        (empty ?? (
          <DataTableEmpty
            filter={
              filters ? describeFilters(params.filters, filters) : undefined
            }
          />
        ))
      ) : (
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
            className={navigating ? "opacity-60 transition-opacity" : undefined}
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
      )}

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          {total
            ? `${first}–${last} of ${total}${unit}`
            : `0${unit || " results"}`}
          {navigating && <Spinner />}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage() || navigating}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage() || navigating}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
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
  filters: readonly DataTableFilterDef[];
  active: TableFilters;
  disabled?: boolean;
  onChange: (filters: TableFilters) => void;
}) {
  const [values, setValues] = useState<TableFilters>(active);
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
      {filters.map((def) =>
        def.options ? (
          <Combobox
            key={def.field}
            items={def.options}
            // Items are { value, label }, so the input shows the label.
            value={
              def.options.find((o) => o.value === values[def.field]) ?? null
            }
            onValueChange={(option) => set(def.field, option?.value ?? "")}
          >
            <ComboboxInput
              className="w-40"
              placeholder={def.placeholder ?? `Any ${def.label.toLowerCase()}`}
              aria-label={def.label}
              showClear={Boolean(values[def.field])}
            />
            <ComboboxContent>
              <ComboboxEmpty>No matches</ComboboxEmpty>
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
            placeholder={def.placeholder ?? def.label}
            aria-label={def.label}
          />
        ),
      )}

      <Button type="submit" variant="default" disabled={disabled}>
        <FilterIcon data-icon="inline-start" />
        Filter
      </Button>
      {Object.keys(active).length > 0 && (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange({})}
        >
          <XIcon data-icon="inline-start" />
          Clear
        </Button>
      )}
    </form>
  );
}

/** Default empty state. */
/** `filter` describes the active filters (see describeFilters). */
export function DataTableEmpty({ filter }: { filter?: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>No results</EmptyTitle>
        <EmptyDescription>
          {filter ? `Nothing where ${filter}.` : "There's nothing here yet."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
