import type {
  TaskFilterField,
  TaskSortField,
  TaskType,
} from "@backend/contracts";
import { defineDataTable } from "./data-table";

/** Labels of the type values. */
export const TASK_TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "other", label: "Other" },
] satisfies { value: TaskType; label: string }[];

/**
 * The tasks table: plain data with no server-only imports (unlike
 * lib/tasks.ts), so it's shared by the server page (reads the URL)
 * and the client table (builds links). Sort and filter fields are checked
 * against the backend's contract (type-only import: keeps Zod out of the
 * list page's bundle); every filter matches text the field contains, and
 * they combine with AND.
 */
export const tasksTable = defineDataTable({
  path: "/tasks",
  // The backend allows up to 100.
  pageSizes: [10, 20, 50],
  sortable: ["name", "createdAt", "updatedAt"] satisfies TaskSortField[],
  defaultSort: { id: "name", desc: false },
  filters: [{ field: "name" satisfies TaskFilterField, label: "Name" }],
});

/**
 * Tasks live inside their activity: there's no list of all tasks, so the
 * task pages lead back to the activity's page.
 */
export const activityHref = (activityId: string) =>
  `/activities/${encodeURIComponent(activityId)}`;
