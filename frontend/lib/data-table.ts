/**
 * URL state for server-side data tables: one param per filter field (e.g.
 * `?email=ada&role=admin`), `?page=` (1-based), `?sort=` (column id) and
 * `?dir=` (asc | desc). The URL is the source of truth, so any view can be
 * shared or reloaded. Filter fields must not be named page, sort or dir.
 */

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

export interface TableParams {
  filters: TableFilters;
  page: number;
  pageSize: number;
  /** Rows to skip, for the backend's `offset`. */
  offset: number;
  sort: TableSort;
  /** The table's default sort; it's left out of URLs. */
  defaultSort: TableSort;
}

type SearchParams = Record<string, string | string[] | undefined>;

export interface TableParamsOptions {
  pageSize?: number;
  /** Column ids the backend can sort by; others in the URL are ignored. */
  sortable: readonly string[];
  /** Fields the backend can filter by; others in the URL are ignored. */
  filterable?: readonly string[];
  defaultSort: TableSort;
}

/** Drops empty values and trims the rest. */
export function cleanFilters(filters: TableFilters): TableFilters {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([field, value]) => [field, value.trim()] as const)
      .filter(([, value]) => value),
  );
}

/** Reads filters, page and sort from a page's `searchParams`. */
export function getTableParams(
  params: SearchParams,
  { pageSize = 20, sortable, filterable = [], defaultSort }: TableParamsOptions,
): TableParams {
  const filters = cleanFilters(
    Object.fromEntries(
      filterable.flatMap((field) => {
        const value = params[field];
        return typeof value === "string" ? [[field, value]] : [];
      }),
    ),
  );
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const sort =
    typeof params.sort === "string" && sortable.includes(params.sort)
      ? { id: params.sort, desc: params.dir === "desc" }
      : defaultSort;
  return {
    filters,
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    sort,
    defaultSort,
  };
}

/** URL of a table view. Page 1, empty filters and the default sort are omitted. */
export function tableHref(
  path: string,
  params: Pick<TableParams, "filters" | "sort" | "defaultSort"> & {
    page?: number;
  },
) {
  const { filters, page, sort, defaultSort } = params;
  const query = new URLSearchParams(cleanFilters(filters));
  if (sort.id !== defaultSort.id || sort.desc !== defaultSort.desc) {
    query.set("sort", sort.id);
    query.set("dir", sort.desc ? "desc" : "asc");
  }
  if (page && page > 1) query.set("page", String(page));
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
