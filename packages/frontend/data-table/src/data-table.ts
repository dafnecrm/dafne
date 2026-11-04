/**
 * Config and URL state for server-side data tables.
 *
 * Each table defines one config with `defineDataTable` (path, page sizes,
 * sort and filter fields). It's plain data, so the server page reads the URL
 * with it (`getTableParams`) and the client `DataTable` builds links with it.
 *
 * URL: one param per filter field (e.g. `?email=ada&role=admin`), `?page=`
 * (1-based), `?limit=` (rows per page), `?sort=` (column id) and `?dir=`
 * (asc | desc). The URL is the source of truth, so any view can be shared or
 * reloaded. Filter fields must not be named page, limit, sort or dir.
 *
 * Labels are message keys (see i18n/keys.ts), translated by DataTable.
 */

import type { MessageKey } from "@dafne/frontend-ui/lib/message-key";

export interface TableSort {
  /** Column id, which is also the backend's sort field. */
  id: string;
  desc: boolean;
}

/**
 * Active filters by field, e.g. `{ email: "ada", role: "admin" }`. They
 * combine with AND; the backend picks each field's operator (contains,
 * equals…). Only non-empty values are kept.
 */
export type TableFilters = Record<string, string>;

/**
 * A field the table can be filtered by. With `options` the value is picked
 * from a list (the backend matches it exactly); without, it's typed in.
 */
export interface TableFilterDef {
  /** Backend filter field, e.g. "email". */
  field: string;
  label: MessageKey;
  placeholder?: MessageKey;
  options?: readonly TableOption[];
}

/** A value to pick, e.g. `{ value: "person", label: "customers.type.person" }`. */
export interface TableOption {
  value: string;
  label: MessageKey;
}

/** A table's config, with defaults filled in (see `defineDataTable`). */
export interface DataTableConfig {
  /** Page path, used for filter, sort and paging URLs. */
  path: string;
  /** Page sizes the picker offers. */
  pageSizes: readonly number[];
  /** Page size without `?limit=`. */
  defaultPageSize: number;
  /** Column ids the backend can sort by; others in the URL are ignored. */
  sortable: readonly string[];
  /** Sort without `?sort=`. */
  defaultSort: TableSort;
  /** Fields to filter by; others in the URL are ignored. */
  filters: readonly TableFilterDef[];
}

export const DEFAULT_PAGE_SIZES: readonly number[] = [10, 20, 50];
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Defines a table. Page sizes default to 10, 20 and 50; the default page
 * size is 20 when offered, otherwise the first size. Define it at module
 * scope in a plain (not "use client") module, so server and client share it.
 */
export function defineDataTable({
  pageSizes = DEFAULT_PAGE_SIZES,
  defaultPageSize = pageSizes.includes(DEFAULT_PAGE_SIZE)
    ? DEFAULT_PAGE_SIZE
    : pageSizes[0],
  filters = [],
  ...config
}: Omit<DataTableConfig, "pageSizes" | "defaultPageSize" | "filters"> &
  Partial<
    Pick<DataTableConfig, "pageSizes" | "defaultPageSize" | "filters">
  >): DataTableConfig {
  if (!pageSizes.includes(defaultPageSize))
    throw new Error(
      `${config.path}: default page size ${defaultPageSize} is not in pageSizes`,
    );
  return { ...config, pageSizes, defaultPageSize, filters };
}

/** The current view of a table, read from the URL. */
export interface TableParams {
  filters: TableFilters;
  page: number;
  /** Rows per page, for the backend's `limit`. */
  pageSize: number;
  /** Rows to skip, for the backend's `offset`. */
  offset: number;
  sort: TableSort;
}

type SearchParams = Record<string, string | string[] | undefined>;

/** Drops empty values and trims the rest. */
export function cleanFilters(filters: TableFilters): TableFilters {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([field, value]) => [field, value.trim()] as const)
      .filter(([, value]) => value),
  );
}

/** Reads filters, page, page size and sort from a page's `searchParams`. */
export function getTableParams(
  params: SearchParams,
  config: DataTableConfig,
): TableParams {
  const filters = cleanFilters(
    Object.fromEntries(
      config.filters.flatMap(({ field }) => {
        const value = params[field];
        return typeof value === "string" ? [[field, value]] : [];
      }),
    ),
  );
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const limit = Number(params.limit);
  // Only offered sizes, so the URL can't ask the backend for any size.
  const pageSize = config.pageSizes.includes(limit)
    ? limit
    : config.defaultPageSize;
  const sort =
    typeof params.sort === "string" && config.sortable.includes(params.sort)
      ? { id: params.sort, desc: params.dir === "desc" }
      : config.defaultSort;
  return { filters, page, pageSize, offset: (page - 1) * pageSize, sort };
}

/**
 * URL of a table view. Page 1, empty filters, the default page size and the
 * default sort are omitted.
 */
export function tableHref(
  config: DataTableConfig,
  { filters, page, pageSize, sort }: Omit<TableParams, "offset">,
) {
  const query = new URLSearchParams(cleanFilters(filters));
  const { defaultSort } = config;
  if (sort.id !== defaultSort.id || sort.desc !== defaultSort.desc) {
    query.set("sort", sort.id);
    query.set("dir", sort.desc ? "desc" : "asc");
  }
  if (pageSize !== config.defaultPageSize) query.set("limit", String(pageSize));
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  return qs ? `${config.path}?${qs}` : config.path;
}
