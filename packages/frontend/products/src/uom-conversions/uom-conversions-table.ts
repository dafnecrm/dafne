import type {
  UomConversionSortField,
  UomConversionFilterField,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import { type UomConversionsMessageKey } from "./messages/index.ts";

/** Sort of the list without `?sort=`. */
export const UOM_CONVERSIONS_DEFAULT_SORT = { id: "fromUomId", desc: false };

/** A uom conversions table's config: its path is always set (detail links use it). */
export type UomConversionsTableConfig = DataTableConfig & { path: string };

export interface UomConversionsTableOptions {
  /** Path of the app's uom conversions list page, e.g. "/uom-conversions". */
  path: string;
}

/**
 * The uom conversions table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineUomConversionsTable({
  path,
}: UomConversionsTableOptions): UomConversionsTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "fromUomId",
      "toUomId",
      "factor",
      "createdAt",
      "updatedAt",
    ] satisfies UomConversionSortField[],
    defaultSort: UOM_CONVERSIONS_DEFAULT_SORT,
    // { field: "…" satisfies UomConversionFilterField, label: "…" satisfies UomConversionsMessageKey }, added with the fields.
    filters: [
      {
        field: "id" satisfies UomConversionFilterField,
        label: "uomConversions.fields.id" satisfies UomConversionsMessageKey,
      },
      {
        field: "fromUomId" satisfies UomConversionFilterField,
        label:
          "uomConversions.fields.fromUomId" satisfies UomConversionsMessageKey,
      },
      {
        field: "toUomId" satisfies UomConversionFilterField,
        label:
          "uomConversions.fields.toUomId" satisfies UomConversionsMessageKey,
      },
      {
        field: "uomId" satisfies UomConversionFilterField,
        label: "uomConversions.fields.uomId" satisfies UomConversionsMessageKey,
      },
    ],
  });
  return { ...config, path };
}
