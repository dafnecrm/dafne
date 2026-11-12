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
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
} from '@dafne/backend-crud';

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
export class ActivitiesService
  implements
    CrudService<
      number,
      ListActivitiesQuery,
      ActivitiesList,
      ActivityBody,
      ActivityDetail
    >
{
  /** Runs the writes with the hooks registered on `activities`. */
  private readonly hooks: CrudHooks<number, ActivityBody, ActivityDetail>;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
  ) {
    this.hooks = registry.for('activities', { db, load: (id, tx) => this.get(id, tx) });
  }

  /**
   * Lists activities that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(
    query: ListActivitiesQuery = {},
  ): Promise<ActivitiesList> {
    const {
      limit = ACTIVITIES_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'desc',
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

    return { items: activities, total, limit, offset };
  }

  /**
   * One activity that isn't deleted, with who created and last updated
   * it. Throws 404 otherwise.
   */
  async get(id: number, db: Executor = this.db): Promise<ActivityDetail> {
    const found = await db.query.activity.findFirst({
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

  /** Creates a activity; `actor` is the creator. */
  async create(
    body: ActivityBody,
    actor: Actor,
  ): Promise<ActivityDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    return this.hooks.create({ body, actor }, async ({ tx, body }) => {
      const [{ id }] = await tx
        .insert(activity)
        .values({
          name: body.name,
          type: body.type,
          dueDate: body.dueDate,
          notes: body.notes,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: activity.id });
      return id;
    });
  }

  /**
   * Replaces a activity's fields; `actor` is the editor.
   * Throws 404 if the activity doesn't exist, is deleted or is closed.
   */
  async update(
    id: number,
    body: ActivityBody,
    actor: Actor,
  ): Promise<ActivityDetail> {
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      const result = await tx
        .update(activity)
        .set({
          name: body.name,
          type: body.type,
          dueDate: body.dueDate,
          notes: body.notes,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(activity.id, id), notDeleted, notClosed));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('activities.notFound'));
      }
    });
  }

  /**
   * Deletes a activity logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(activity)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(activity.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('activities.notFound'));
      }
    });
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
