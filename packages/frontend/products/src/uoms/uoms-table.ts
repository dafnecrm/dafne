import type { UomSortField, UomKind, UomFilterField } from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import { type UomsMessageKey } from "./messages/index.ts";

/** Labels (message keys) of the kind values. */
export const UOM_KIND_OPTIONS = [
  { value: "weight", label: "uoms.kind.weight" },
  { value: "volume", label: "uoms.kind.volume" },
  { value: "length", label: "uoms.kind.length" },
  { value: "area", label: "uoms.kind.area" },
  { value: "count", label: "uoms.kind.count" },
  { value: "time", label: "uoms.kind.time" },
] satisfies { value: UomKind; label: UomsMessageKey }[];

/** Sort of the list without `?sort=`. */
export const UOMS_DEFAULT_SORT = { id: "id", desc: false };

/** A uoms table's config: its path is always set (detail links use it). */
export type UomsTableConfig = DataTableConfig & { path: string };

export interface UomsTableOptions {
  /** Path of the app's uoms list page, e.g. "/uoms". */
  path: string;
}

/**
 * The uoms table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineUomsTable({ path }: UomsTableOptions): UomsTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "name",
      "description",
      "kind",
      "createdAt",
      "updatedAt",
    ] satisfies UomSortField[],
    defaultSort: UOMS_DEFAULT_SORT,
    // { field: "…" satisfies UomFilterField, label: "…" satisfies UomsMessageKey }, added with the fields.
    filters: [
      {
        field: "id" satisfies UomFilterField,
        label: "uoms.fields.id" satisfies UomsMessageKey,
      },
      {
        field: "name" satisfies UomFilterField,
        label: "uoms.fields.name" satisfies UomsMessageKey,
      },
      {
        field: "description" satisfies UomFilterField,
        label: "uoms.fields.description" satisfies UomsMessageKey,
      },
      {
        field: "kind" satisfies UomFilterField,
        label: "uoms.fields.kind" satisfies UomsMessageKey,
        options: UOM_KIND_OPTIONS,
      },
    ],
  });
  return { ...config, path };
}
