import type {
  ActivityFilterField,
  ActivitySortField,
  ActivityType,
  ActivityStatus,
} from "@backend/contracts";
import { defineDataTable } from "./data-table";

/** Labels of the type values. */
export const ACTIVITY_TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
] satisfies { value: ActivityType; label: string }[];

/** Labels of the status values. */
export const ACTIVITY_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" },
] satisfies { value: ActivityStatus; label: string }[];

/**
 * The activities table: plain data with no server-only imports (unlike
 * lib/activities.ts), so it's shared by the server page (reads the URL)
 * and the client table (builds links). Sort and filter fields are checked
 * against the backend's contract (type-only import: keeps Zod out of the
 * list page's bundle); every filter matches text the field contains, and
 * they combine with AND.
 */
export const activitiesTable = defineDataTable({
  path: "/activities",
  // The backend allows up to 100.
  pageSizes: [10, 20, 50],
  sortable: [
    "name",
    "type",
    "completedAt",
    "status",
    "createdAt",
    "updatedAt",
  ] satisfies ActivitySortField[],
  defaultSort: { id: "name", desc: false },
  filters: [
    { field: "name" satisfies ActivityFilterField, label: "Name" },
    {
      field: "type" satisfies ActivityFilterField,
      label: "Type",
      placeholder: "Any type",
      options: ACTIVITY_TYPE_OPTIONS,
    },
    {
      field: "status" satisfies ActivityFilterField,
      label: "Status",
      placeholder: "Any status",
      options: ACTIVITY_STATUS_OPTIONS,
    },
  ],
});
