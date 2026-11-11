import type {
  ActivityFilterField,
  ActivitySortField
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import { ACTIVITY_TYPE_OPTIONS } from "./activity-type-options.ts";
import { ACTIVITY_STATUS_OPTIONS } from "./activity-status-options.ts";

/** Sort of the list without `?sort=`. */
export const ACTIVITIES_DEFAULT_SORT = { id: "id", desc: true };

/** A activities table's config: its path is always set (detail links use it). */
export type ActivitiesTableConfig = DataTableConfig & { path: string };

export interface ActivitiesTableOptions {
  /** Path of the app's activities list page, e.g. "/activities". */
  path: string;
}
/**
 * The activities table: plain data with no server-only imports (unlike
 * lib/activities.ts), so it's shared by the server page (reads the URL)
 * and the client table (builds links). Sort and filter fields are checked
 * against the backend's contract (type-only import: keeps Zod out of the
 * list page's bundle); every filter matches text the field contains, and
 * they combine with AND.
 */
export function defineActivitiesTable({
  path,
}: ActivitiesTableOptions): ActivitiesTableConfig {
  const config = defineDataTable({
    path: "/activities",
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "name",
      "type",
      "dueDate",
      "completedAt",
      "status",
      "createdAt",
      "updatedAt",
    ] satisfies ActivitySortField[],
    defaultSort: ACTIVITIES_DEFAULT_SORT,
    filters: [
      {
        field: "id" satisfies ActivityFilterField,
        label: "activities.fields.id",
      },
      {
        field: "name" satisfies ActivityFilterField,
        label: "activities.fields.name",
      },
      {
        field: "type" satisfies ActivityFilterField,
        label: "activities.fields.type",
        options: ACTIVITY_TYPE_OPTIONS,
      },
      {
        field: "status" satisfies ActivityFilterField,
        label: "activities.fields.status",
        options: ACTIVITY_STATUS_OPTIONS,
      },
    ],
  })

  return { ...config, path };

}



