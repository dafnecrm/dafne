/**
 * URL state for server-side data tables: `?q=` (search), `?page=` (1-based),
 * `?sort=` (column id) and `?dir=` (asc | desc). The URL is the source of
 * truth, so any view can be shared or reloaded.
 */

export interface TableSort {
  /** Column id, which is also the backend's sort field. */
  id: string;
  desc: boolean;
}

export interface TableParams {
  search: string;
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
  defaultSort: TableSort;
}

/** Reads search, page and sort from a page's `searchParams`. */
export function getTableParams(
  params: SearchParams,
  { pageSize = 20, sortable, defaultSort }: TableParamsOptions,
): TableParams {
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const sort =
    typeof params.sort === "string" && sortable.includes(params.sort)
      ? { id: params.sort, desc: params.dir === "desc" }
      : defaultSort;
  return {
    search,
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    sort,
    defaultSort,
  };
}

/** URL of a table view. Page 1, an empty search and the default sort are omitted. */
export function tableHref(
  path: string,
  params: Pick<TableParams, "search" | "sort" | "defaultSort"> & {
    page?: number;
  },
) {
  const { search, page, sort, defaultSort } = params;
  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (sort.id !== defaultSort.id || sort.desc !== defaultSort.desc) {
    query.set("sort", sort.id);
    query.set("dir", sort.desc ? "desc" : "asc");
  }
  if (page && page > 1) query.set("page", String(page));
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
