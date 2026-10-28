import { DatabaseService, schema } from '@app/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, isNull, like, type SQL } from 'drizzle-orm';
import {
  ACTIVITY_FILTER_FIELDS,
  type ActivityBody,
  type ActivityDetail,
  type ActivitiesList,
  type ListActivitiesQuery,
} from '@app/contracts';

export const DEFAULT_PAGE_SIZE = 20;

const { activity } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** Activities that haven't been deleted. */
const notDeleted = isNull(activity.deletedAt);

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
   * One activity that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async getActivity(id: string): Promise<ActivityDetail> {
    const found = await this.database.db.query.activity.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) throw new NotFoundException('Activity not found');
    return found;
  }

  /** Creates a activity; `userId` is the creator. */
  async createActivity(
    body: ActivityBody,
    userId: string,
  ): Promise<ActivityDetail> {
    const id = randomUUID();
    // Set here, not by the column default: MySQL's now() and the driver can
    // disagree on the time zone, while dates written from JS round-trip.
    const now = new Date();
    await this.database.db.insert(activity).values({
      id,
      name: body.name,
      type: body.type,
      createdAt: now,
      updatedAt: now,
      createdById: userId,
      updatedById: userId,
    });
    return this.getActivity(id);
  }

  /**
   * Replaces a activity's fields; `userId` is the editor. Throws 404
   * if the activity doesn't exist or is deleted.
   */
  async updateActivity(
    id: string,
    body: ActivityBody,
    userId: string,
  ): Promise<ActivityDetail> {
    const [result] = await this.database.db
      .update(activity)
      .set({
        name: body.name,
        updatedById: userId,
        // Set explicitly so the row always changes and is counted below.
        updatedAt: new Date(),
      })
      .where(and(eq(activity.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException('Activity not found');
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
}
