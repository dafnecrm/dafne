import type { Database } from '@dafne/backend-database';
import { user } from '@dafne/backend-database-auth';
import { task } from '@dafne/backend-database-tasks';
import {
  msg,
  type ListedTask,
  type ListTaskRunsQuery,
  type TaskDetail,
  type TaskRunDetail,
  type TaskRunsList,
  type TasksList,
  type UpdateTaskBody,
} from '@dafne/contracts';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq, inArray } from 'drizzle-orm';
import { checkSchedule } from './schedule.js';
import { TaskRuns } from './task-runs.js';
import { TasksClient } from './tasks.client.js';
import { TasksRegistry } from './tasks.registry.js';
import { TasksScheduler } from './tasks.scheduler.js';

/** The tasks as admins see them (TasksController): settings, runs, starting them. */
@Injectable()
export class TasksService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly registry: TasksRegistry,
    private readonly scheduler: TasksScheduler,
    private readonly runs: TaskRuns,
    private readonly client: TasksClient,
  ) {}

  /** Every task in code, by key. */
  async list(): Promise<TasksList> {
    return this.listed(this.registry.all().map(({ options }) => options.key));
  }

  async get(key: string): Promise<TaskDetail> {
    this.known(key);
    const [row] = await this.db
      .select({ updatedAt: task.updatedAt, updatedById: task.updatedBy, updatedByName: user.name })
      .from(task)
      .leftJoin(user, eq(user.id, task.updatedBy))
      .where(eq(task.key, key));
    const [listed] = await this.listed([key]);
    if (!row || !listed) {
      throw new NotFoundException(msg('tasks.notFound'));
    }
    return {
      ...listed,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedById && row.updatedByName !== null ? { id: row.updatedById, name: row.updatedByName } : null,
    };
  }

  /** Replaces the task's settings (they stop following the code's) and its schedule. */
  async update(key: string, body: UpdateTaskBody, actor: { id: string }): Promise<TaskDetail> {
    this.known(key);
    checkSchedule(body.cron, body.timezone);
    const rows = await this.db
      .update(task)
      .set({ ...body, customized: true, updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(task.key, key))
      .returning({ key: task.key });
    if (!rows.length) {
      throw new NotFoundException(msg('tasks.notFound'));
    }
    await this.scheduler.sync(key);
    return this.get(key);
  }

  /** Back to the code's settings. */
  async reset(key: string, actor: { id: string }): Promise<TaskDetail> {
    this.known(key);
    await this.db
      .update(task)
      .set({ customized: false, updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(task.key, key));
    await this.scheduler.register();
    await this.scheduler.sync(key);
    return this.get(key);
  }

  /** Starts a run now; a 409 when the task has one queued or running already. */
  async start(key: string, actor: { id: string }): Promise<TaskRunDetail> {
    this.known(key);
    const { runId, skipped } = await this.client.trigger(key, { actor, trigger: 'manual' });
    if (skipped) {
      throw new ConflictException(msg('tasks.alreadyRunning'));
    }
    return this.runs.get(runId);
  }

  runsOf(key: string, query: ListTaskRunsQuery): Promise<TaskRunsList> {
    this.known(key);
    return this.runs.list(key, query);
  }

  run(id: number): Promise<TaskRunDetail> {
    return this.runs.get(id);
  }

  /** A 404 unless the app defines the task. */
  private known(key: string): void {
    if (!this.registry.has(key)) {
      throw new NotFoundException(msg('tasks.notFound'));
    }
  }

  private async listed(keys: string[]): Promise<ListedTask[]> {
    if (!keys.length) {
      return [];
    }
    const [rows, latest, next] = await Promise.all([
      this.db.select().from(task).where(inArray(task.key, keys)),
      this.runs.latest(keys),
      Promise.all(keys.map((key) => this.scheduler.nextRunAt(key))),
    ]);
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return keys.flatMap((key, i) => {
      const row = byKey.get(key);
      if (!row) {
        return [];
      }
      return [
        {
          key,
          cron: row.cron,
          timezone: row.timezone,
          enabled: row.enabled,
          timeoutSeconds: row.timeoutSeconds,
          customized: row.customized,
          defaultCron: this.registry.get(key)?.options.cron ?? null,
          nextRunAt: row.enabled && row.cron ? next[i] : null,
          lastRun: latest.get(key) ?? null,
        },
      ];
    });
  }
}
