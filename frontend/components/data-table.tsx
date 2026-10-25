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
  InboxIcon,
  SearchIcon,
} from "lucide-react";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { useMemo, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { tableHref, type TableParams } from "@/lib/data-table";

/*
 * Generic data table on TanStack Table v9, for server-paginated lists.
 * The server fetches one sorted page; search (?q=), page (?page=) and sort
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

export interface DataTableProps<TData extends RowData> {
  /** Keep stable (module scope or useMemo). */
  columns: DataTableColumnDef<TData>[];
  /** The current page of rows, as returned by the server. */
  data: TData[];
  /** Row key; defaults to the row index. */
  getRowId?: (row: TData, index: number) => string;
  /** Page path, used for search and paging URLs. */
  path: string;
  params: TableParams;
  /** Total rows across all pages. */
  total: number;
  /** Shows the search box when set. */
  searchPlaceholder?: string;
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
  searchPlaceholder,
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
      {searchPlaceholder && (
        <DataTableSearch
          path={path}
          params={params}
          placeholder={searchPlaceholder}
        />
      )}

      {rows.length === 0 ? (
        (empty ?? <DataTableEmpty search={params.search} />)
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
 * GET form: the search ends up in the URL (?q=) and resets to page 1.
 * Keeps the current sort.
 */
export function DataTableSearch({
  path,
  params,
  placeholder,
}: {
  path: string;
  params: TableParams;
  placeholder: string;
}) {
  const { search, sort, defaultSort } = params;
  const customSort =
    sort.id !== defaultSort.id || sort.desc !== defaultSort.desc;
  return (
    <Form action={path} className="flex max-w-sm gap-2">
      {customSort && (
        <>
          <input type="hidden" name="sort" value={sort.id} />
          <input type="hidden" name="dir" value={sort.desc ? "desc" : "asc"} />
        </>
      )}
      <Input
        name="q"
        type="search"
        defaultValue={search}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <Button type="submit" variant="outline">
        <SearchIcon data-icon="inline-start" />
        Search
      </Button>
    </Form>
  );
}

/** Default empty state. */
export function DataTableEmpty({ search }: { search?: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>No results</EmptyTitle>
        <EmptyDescription>
          {search
            ? `Nothing matches “${search}”.`
            : "There's nothing here yet."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
