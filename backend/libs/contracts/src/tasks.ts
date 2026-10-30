import { z } from 'zod';
import { pageQuery, requiredText, SORT_DIRECTIONS } from './common.ts';

/* ---------- Requests ---------- */

/** Values of task type. */
export const TASK_TYPES = ['email', 'phone', 'other'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

/**
 * Body of POST /tasks and PUT /tasks/:id. PUT replaces the
 * whole task: omitted optional fields are cleared.
 */
export const taskBodySchema = z.strictObject({
  name: requiredText(255, 'Enter the name'),
  dueDate: z.coerce.date({ error: 'Enter a valid date' }),
  notes: requiredText(65535, 'Enter the notes'),
  type: z.enum(TASK_TYPES, { error: 'Choose the type' }),
  activityId: requiredText(36, 'Enter the activity id'),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type TaskBodyInput = z.input<typeof taskBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type TaskBody = z.output<typeof taskBodySchema>;

/** Task fields the list can be sorted by. */
export const TASK_SORT_FIELDS = [
  'name',
  'dueDate',
  'type',
  'createdAt',
  'updatedAt',
] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

/**
 * Task fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains.
 */
export const TASK_FILTER_FIELDS = ['name', 'type', 'activityId'] as const;
export type TaskFilterField = (typeof TASK_FILTER_FIELDS)[number];

/** Query string of GET /tasks. Deleted tasks are never listed. */
export const listTasksQuerySchema = z.strictObject({
  ...pageQuery,
  name: z.string().max(255).optional(),
  type: z.enum(TASK_TYPES).optional(),
  activityId: z.string().max(36).optional(),
  /** Defaults to name. */
  sortBy: z.enum(TASK_SORT_FIELDS).optional(),
  /** Defaults to asc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListTasksQuery = z.output<typeof listTasksQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A task in GET /tasks. */
export interface ListedTask {
  id: string;
  name: string;
  dueDate: Date;
  type: TaskType;
  activityId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /tasks. */
export interface TasksList {
  tasks: ListedTask[];
  total: number;
  limit: number;
  offset: number;
}

/** A user who created or last updated a task; null if since removed. */
export interface TaskUser {
  id: string;
  name: string;
}

/** Response of GET /tasks/:id, POST /tasks and PUT /tasks/:id. */
export interface TaskDetail extends ListedTask {
  createdBy: TaskUser | null;
  updatedBy: TaskUser | null;
  notes: string;
  /** Always null: deleted tasks aren't returned. */
  deletedAt: Date | null;
}
