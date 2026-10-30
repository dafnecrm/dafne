import { DatabaseService, schema } from '@app/database';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  like,
  ne,
  type SQL,
} from 'drizzle-orm';
import {
  ACTIVITY_FILTER_FIELDS,
  type ActivityBody,
  type ActivityTaskBody,
  type ActivityDetail,
  type ActivitiesList,
  type ListActivitiesQuery,
} from '@app/contracts';

export const DEFAULT_PAGE_SIZE = 20;

const { activity, task } = schema;

type Transaction = Parameters<
  Parameters<DatabaseService['db']['transaction']>[0]
>[0];

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** Activities that haven't been deleted. */
const notDeleted = isNull(activity.deletedAt);
const notClosed = ne(activity.status, 'closed');

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class ActivitiesService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Lists activities that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async listActivities(
    query: ListActivitiesQuery = {},
  ): Promise<ActivitiesList> {
    const {
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'name',
      sortDirection = 'asc',
    } = query;
    const { db } = this.database;
    const filters = ACTIVITY_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      return value ? [like(activity[field], `%${escapeLike(value)}%`)] : [];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const order = sortDirection === 'asc' ? asc : desc;

    const [activities, total] = await Promise.all([
      db
        .select({
          id: activity.id,
          name: activity.name,
          type: activity.type,
          completedAt: activity.completedAt,
          completedById: activity.completedById,
          status: activity.status,
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
        })
        .from(activity)
        .where(where)
        .orderBy(order(activity[sortBy]), asc(activity.id))
        .limit(limit)
        .offset(offset),
      db.$count(activity, where),
    ]);

    return { activities, total, limit, offset };
  }

  /**
   * One activity that isn't deleted, with its tasks and who created and
   * last updated it. Throws 404 otherwise.
   */
  async getActivity(id: string): Promise<ActivityDetail> {
    const found = await this.database.db.query.activity.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        createdBy: userSummary,
        updatedBy: userSummary,
        tasks: {
          where: { deletedAt: { isNull: true } },
          columns: {
            id: true,
            name: true,
            dueDate: true,
            type: true,
            notes: true,
          },
          orderBy: { dueDate: 'asc' },
        },
      },
    });
    if (!found) throw new NotFoundException('Activity not found');
    return found;
  }

  /** Creates a activity and its tasks; `userId` is the creator. */
  async createActivity(
    body: ActivityBody,
    userId: string,
  ): Promise<ActivityDetail> {
    const id = randomUUID();
    // Set here, not by the column default: MySQL's now() and the driver can
    // disagree on the time zone, while dates written from JS round-trip.
    const now = new Date();
    await this.database.db.transaction(async (tx) => {
      await tx.insert(activity).values({
        id,
        name: body.name,
        type: body.type,
        notes: body.notes,
        createdAt: now,
        updatedAt: now,
        createdById: userId,
        updatedById: userId,
      });
      await saveTasks(tx, id, body.tasks, userId, now);
    });
    return this.getActivity(id);
  }

  /**
   * Replaces a activity's fields and tasks; `userId` is the editor.
   * Throws 404 if the activity doesn't exist, is deleted or is closed.
   */
  async updateActivity(
    id: string,
    body: ActivityBody,
    userId: string,
  ): Promise<ActivityDetail> {
    const now = new Date();
    await this.database.db.transaction(async (tx) => {
      const [result] = await tx
        .update(activity)
        .set({
          name: body.name,
          type: body.type,
          notes: body.notes,
          updatedById: userId,
          // Set explicitly so the row always changes and is counted below.
          updatedAt: now,
        })
        .where(and(eq(activity.id, id), notDeleted, notClosed));
      if (result.affectedRows === 0)
        throw new NotFoundException('Activity not found');
      await saveTasks(tx, id, body.tasks, userId, now);
    });
    return this.getActivity(id);
  }

  /**
   * Deletes a activity logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async deleteActivity(id: string, userId: string) {
    const now = new Date();
    const [result] = await this.database.db
      .update(activity)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(and(eq(activity.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException('Activity not found');
  }

  /** Completes an activity */
  async closeActivity(id: string, userId: string) {
    const now = new Date();
    const [result] = await this.database.db
      .update(activity)
      .set({ status: 'closed', completedAt: now, completedById: userId })
      .where(and(eq(activity.id, id), notDeleted, notClosed));
    if (result.affectedRows === 0)
      throw new NotFoundException('Activity not found or closed');
  }

  /** Set an activity in progress */
  async setInProgress(id: string, userId: string) {
    const [result] = await this.database.db
      .update(activity)
      .set({ status: 'in_progress', completedAt: null, completedById: null })
      .where(and(eq(activity.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException('Activity not found');
  }
}

/**
 * Brings the activity's tasks in line with `tasks`: those with an id are
 * updated (only when something changed, so "updated by" stays meaningful),
 * those without are created, and the activity's tasks left out are deleted
 * logically. An id that isn't one of the activity's tasks is a 400.
 */
async function saveTasks(
  tx: Transaction,
  activityId: string,
  tasks: ActivityTaskBody[],
  userId: string,
  now: Date,
) {
  const existing = await tx
    .select({
      id: task.id,
      name: task.name,
      dueDate: task.dueDate,
      type: task.type,
      notes: task.notes,
    })
    .from(task)
    .where(and(eq(task.activityId, activityId), isNull(task.deletedAt)));
  const byId = new Map(existing.map((row) => [row.id, row]));

  const unknown = tasks.find((t) => t.id !== undefined && !byId.has(t.id));
  if (unknown)
    throw new BadRequestException([
      `tasks: ${unknown.name} isn't one of this activity's tasks`,
    ]);

  const kept = new Set(tasks.flatMap((t) => (t.id ? [t.id] : [])));
  const removed = existing.map((row) => row.id).filter((id) => !kept.has(id));
  if (removed.length)
    await tx
      .update(task)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(inArray(task.id, removed));

  for (const item of tasks) {
    const before = item.id ? byId.get(item.id) : undefined;
    if (!before) continue;
    const changed =
      before.name !== item.name ||
      before.dueDate.getTime() !== item.dueDate.getTime() ||
      before.type !== item.type ||
      before.notes !== item.notes;
    if (changed)
      await tx
        .update(task)
        .set({
          name: item.name,
          dueDate: item.dueDate,
          type: item.type,
          notes: item.notes,
          updatedAt: now,
          updatedById: userId,
        })
        .where(eq(task.id, before.id));
  }

  const created = tasks.filter((t) => t.id === undefined);
  if (created.length)
    await tx.insert(task).values(
      created.map((item) => ({
        id: randomUUID(),
        activityId,
        name: item.name,
        dueDate: item.dueDate,
        type: item.type,
        notes: item.notes,
        createdAt: now,
        updatedAt: now,
        createdById: userId,
        updatedById: userId,
      })),
    );
}
