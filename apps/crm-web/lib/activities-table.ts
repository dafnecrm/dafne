import type {
  ActivityFilterField,
  ActivitySortField,
  ActivityType,
  ActivityStatus,
} from "@dafne/contracts";
import type { MessageKey } from "@dafne/frontend-ui/lib/message-key";
import { defineDataTable } from "@dafne/frontend-data-table";
import { CircleIcon, CircleOffIcon, LucideIcon } from "lucide-react";

/** Labels (message keys) of the type values. */
export const ACTIVITY_TYPE_OPTIONS = [
  { value: "call", label: "activities.type.call" },
  { value: "email", label: "activities.type.email" },
  { value: "meeting", label: "activities.type.meeting" },
  { value: "task", label: "activities.type.task" },
] satisfies { value: ActivityType; label: MessageKey }[];

/** Labels (message keys) of the status values. */
export const ACTIVITY_STATUS_OPTIONS = [
  { value: "open", label: "activities.status.open", icon: CircleIcon },
  { value: "closed", label: "activities.status.closed", icon: CircleOffIcon },
] satisfies { value: ActivityStatus; label: MessageKey; icon: LucideIcon }[];

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
    "dueDate",
    "completedAt",
    "status",
    "createdAt",
    "updatedAt",
  ] satisfies ActivitySortField[],
  defaultSort: { id: "name", desc: false },
  filters: [
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
});
