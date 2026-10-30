import { z } from 'zod';
import {
  pageQuery,
  requiredText,
  SORT_DIRECTIONS,
  optionalText,
} from './common.ts';
import { taskBodySchema, type TaskType } from './tasks.ts';

/* ---------- Requests ---------- */

/** Values of activity type. */
export const ACTIVITY_TYPES = ['email', 'phone'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Values of activity status. */
export const ACTIVITY_STATUSES = ['open', 'in_progress', 'closed'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

/**
 * A task in the activity's body: the task's fields, without the activity
 * (it's this one). With the `id` of one of the activity's tasks it updates
 * that task; without, it creates one.
 */
export const activityTaskBodySchema = taskBodySchema
  .omit({ activityId: true })
  .extend({ id: z.string().max(36).optional() });

/**
 * Body of POST /activities and PUT /activities/:id. PUT replaces the
 * whole activity: omitted optional fields are cleared, and tasks left out
 * of `tasks` are deleted.
 */
export const activityBodySchema = z.strictObject({
  name: requiredText(255, 'Enter the name'),
  type: z.enum(ACTIVITY_TYPES, { error: 'Choose the type' }),
  notes: optionalText(z.string().max(65535)),
  tasks: z.array(activityTaskBodySchema).max(100).default([]),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type ActivityBodyInput = z.input<typeof activityBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type ActivityBody = z.output<typeof activityBodySchema>;
export type ActivityTaskBody = ActivityBody['tasks'][number];

/** Activity fields the list can be sorted by. */
export const ACTIVITY_SORT_FIELDS = [
  'name',
  'type',
  'completedAt',
  'status',
  'createdAt',
  'updatedAt',
] as const;
export type ActivitySortField = (typeof ACTIVITY_SORT_FIELDS)[number];

/**
 * Activity fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains.
 */
export const ACTIVITY_FILTER_FIELDS = ['name', 'type', 'status'] as const;
export type ActivityFilterField = (typeof ACTIVITY_FILTER_FIELDS)[number];

/** Query string of GET /activities. Deleted activities are never listed. */
export const listActivitiesQuerySchema = z.strictObject({
  ...pageQuery,
  name: z.string().max(255).optional(),
  type: z.enum(ACTIVITY_TYPES).optional(),
  status: z.enum(ACTIVITY_STATUSES).optional(),
  /** Defaults to name. */
  sortBy: z.enum(ACTIVITY_SORT_FIELDS).optional(),
  /** Defaults to asc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListActivitiesQuery = z.output<typeof listActivitiesQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A activity in GET /activities. */
export interface ListedActivity {
  id: string;
  name: string;
  type: ActivityType;
  completedAt: Date | null;
  status: ActivityStatus;
  completedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /activities. */
export interface ActivitiesList {
  activities: ListedActivity[];
  total: number;
  limit: number;
  offset: number;
}

/** A user who created or last updated a activity; null if since removed. */
export interface ActivityUser {
  id: string;
  name: string;
}

/** A task of the activity, in its detail. */
export interface ActivityTask {
  id: string;
  name: string;
  dueDate: Date;
  type: TaskType;
  notes: string;
}

/** Response of GET /activities/:id, POST /activities and PUT /activities/:id. */
export interface ActivityDetail extends ListedActivity {
  /** Not deleted, soonest due first. */
  tasks: ActivityTask[];
  createdBy: ActivityUser | null;
  updatedBy: ActivityUser | null;
  notes: string | null;
  /** Always null: deleted activities aren't returned. */
  deletedAt: Date | null;
}
