import { DatabaseService, schema } from '@app/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, isNull, like, type SQL } from 'drizzle-orm';
import {
  TASK_FILTER_FIELDS,
  type TaskBody,
  type TaskDetail,
  type TasksList,
  type ListTasksQuery,
} from '@app/contracts';

export const DEFAULT_PAGE_SIZE = 20;

const { task } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** Tasks that haven't been deleted. */
const notDeleted = isNull(task.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

const activitySummary = { columns: { id: true, name: true }} as const;

@Injectable()
export class TasksService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Lists tasks that aren't deleted, paged and sorted, filtered by
   * every field given (AND): ids match exactly (activityId), the other
   * fields match text they contain.
   */
  async listTasks(query: ListTasksQuery = {}): Promise<TasksList> {
    const {
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'name',
      sortDirection = 'asc',
    } = query;
    const { db } = this.database;
    const filters = TASK_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) return [];
      return field === 'activityId'
        ? [eq(task[field], value)]
        : [like(task[field], `%${escapeLike(value)}%`)];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const order = sortDirection === 'asc' ? asc : desc;

    const [tasks, total] = await Promise.all([
      db
        .select({
          id: task.id,
          name: task.name,
          dueDate: task.dueDate,
          type: task.type,
          activityId: task.activityId,
          status: task.status,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        })
        .from(task)
        .where(where)
        .orderBy(order(task[sortBy]), asc(task.id))
        .limit(limit)
        .offset(offset),
      db.$count(task, where),
    ]);

    return { tasks, total, limit, offset };
  }

  /**
   * One task that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async getTask(id: string): Promise<TaskDetail> {
    const found = await this.database.db.query.task.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary, activity: activitySummary },
    });
    if (!found) throw new NotFoundException('Task not found');
    return found;
  }

  /** Creates a task; `userId` is the creator. */
  async createTask(body: TaskBody, userId: string): Promise<TaskDetail> {
    const id = randomUUID();
    // Set here, not by the column default: MySQL's now() and the driver can
    // disagree on the time zone, while dates written from JS round-trip.
    const now = new Date();
    await this.database.db.insert(task).values({
      id,
      name: body.name,
      dueDate: body.dueDate,
      notes: body.notes,
      type: body.type,
      activityId: body.activityId,
      status: body.status,
      createdAt: now,
      updatedAt: now,
      createdById: userId,
      updatedById: userId,
    });
    return this.getTask(id);
  }

  /**
   * Replaces a task's fields; `userId` is the editor. Throws 404
   * if the task doesn't exist or is deleted.
   */
  async updateTask(
    id: string,
    body: TaskBody,
    userId: string,
  ): Promise<TaskDetail> {
    const [result] = await this.database.db
      .update(task)
      .set({
        name: body.name,
        dueDate: body.dueDate,
        notes: body.notes,
        type: body.type,
        activityId: body.activityId,
        status: body.status,
        updatedById: userId,
        // Set explicitly so the row always changes and is counted below.
        updatedAt: new Date(),
      })
      .where(and(eq(task.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException('Task not found');
    return this.getTask(id);
  }

  /**
   * Deletes a task logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async deleteTask(id: string, userId: string) {
    const now = new Date();
    const [result] = await this.database.db
      .update(task)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(and(eq(task.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException('Task not found');
  }
}
