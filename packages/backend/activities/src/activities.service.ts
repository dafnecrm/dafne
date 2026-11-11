import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  isNull,
  ilike,
  ne,
  type Column,
  type SQL,
} from 'drizzle-orm';
import {
  ACTIVITY_FILTER_FIELDS,
  type ActivityFilterField,
  type ActivityBody,
  type ActivityDetail,
  type ActivitiesList,
  type ListActivitiesQuery,
  msg,
} from '@dafne/contracts';

export const ACTIVITIES_DEFAULT_PAGE_SIZE = 20;

const { activity } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<
  Record<ActivityFilterField, (value: string) => number | string>
> = {
  id: Number,
  completedById: String,
};

/** Activities that haven't been deleted. */
const notDeleted = isNull(activity.deletedAt);
const notClosed = ne(activity.status, 'closed');

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class ActivitiesService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Lists activities that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async listActivities(
    query: ListActivitiesQuery = {},
  ): Promise<ActivitiesList> {
    const {
      limit = ACTIVITIES_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'name',
      sortDirection = 'asc',
    } = query;
    const { db } = this;
    const filters = ACTIVITY_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [
        exact
          ? eq(activity[field] as Column, exact(value))
          : ilike(activity[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [activities, total] = await Promise.all([
      db
        .select({
          id: activity.id,
          name: activity.name,
          type: activity.type,
          dueDate: activity.dueDate,
          completedAt: activity.completedAt,
          completedById: activity.completedById,
          status: activity.status,
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
        })
        .from(activity)
        .where(where)
        .orderBy(direction(activity[sortBy]), asc(activity.id))
        .limit(limit)
        .offset(offset),
      db.$count(activity, where),
    ]);

    return { activities, total, limit, offset };
  }

  /**
   * One activity that isn't deleted, with who created and last updated
   * it. Throws 404 otherwise.
   */
  async getActivity(id: number): Promise<ActivityDetail> {
    const found = await this.db.query.activity.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        createdBy: userSummary,
        updatedBy: userSummary,
      },
    });
    if (!found) {
      throw new NotFoundException(msg('activities.notFound'));
    }
    return found;
  }

  /** Creates a activity; `userId` is the creator. */
  async createActivity(
    body: ActivityBody,
    userId: string,
  ): Promise<ActivityDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    const [{ id }] = await this.db
      .insert(activity)
      .values({
        name: body.name,
        type: body.type,
        dueDate: body.dueDate,
        notes: body.notes,
        createdAt: now,
        updatedAt: now,
        createdById: userId,
        updatedById: userId,
      })
      .returning({ id: activity.id });
    return this.getActivity(id);
  }

  /**
   * Replaces a activity's fields; `userId` is the editor.
   * Throws 404 if the activity doesn't exist, is deleted or is closed.
   */
  async updateActivity(
    id: number,
    body: ActivityBody,
    userId: string,
  ): Promise<ActivityDetail> {
    const result = await this.db
      .update(activity)
      .set({
        name: body.name,
        type: body.type,
        dueDate: body.dueDate,
        notes: body.notes,
        updatedById: userId,
        // The time of this change.
        updatedAt: new Date(),
      })
      .where(and(eq(activity.id, id), notDeleted, notClosed));
    if (result.rowCount === 0) {
      throw new NotFoundException(msg('activities.notFound'));
    }
    return this.getActivity(id);
  }

  /**
   * Deletes a activity logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async deleteActivity(id: number, userId: string) {
    const now = new Date();
    const result = await this.db
      .update(activity)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(and(eq(activity.id, id), notDeleted));
    if (result.rowCount === 0) {
      throw new NotFoundException(msg('activities.notFound'));
    }
  }

  /** Completes an activity */
  async closeActivity(id: number, userId: string) {
    const now = new Date();
    const result = await this.db
      .update(activity)
      .set({ status: 'closed', completedAt: now, completedById: userId })
      .where(and(eq(activity.id, id), notDeleted, notClosed));
    if (result.rowCount === 0) {
      throw new NotFoundException(msg('activities.notOpen'));
    }
  }

  /**
   * Reopens a closed activity: open again, and no longer completed. Throws
   * 404 if the activity doesn't exist, is deleted or isn't closed.
   */
  async reopenActivity(id: number) {
    const result = await this.db
      .update(activity)
      .set({ status: 'open', completedAt: null, completedById: null })
      .where(
        and(eq(activity.id, id), notDeleted, eq(activity.status, 'closed')),
      );
    if (result.rowCount === 0) {
      throw new NotFoundException(msg('activities.notClosed'));
    }
  }
}
