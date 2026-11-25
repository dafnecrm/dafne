import { postgresError, PostgresErrorCode } from '@dafne/backend-common';
import type { Database } from '@dafne/backend-database';
import { user } from '@dafne/backend-database-auth';
import { task, taskRun, taskRunLog } from '@dafne/backend-database-tasks';
import {
  ACTIVE_TASK_RUN_STATUSES,
  msg,
  type ListTaskRunsQuery,
  type TaskLogLevel,
  type TaskRun,
  type TaskRunDetail,
  type TaskRunsList,
  type TaskTrigger,
} from '@dafne/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, count, desc, eq, inArray, lt, notInArray, type SQL } from 'drizzle-orm';

export const TASK_RUNS_DEFAULT_PAGE_SIZE = 20;

/** The index that keeps at most one queued or running run per task. */
const ACTIVE_RUN_INDEX = 'task_run_active_idx';

/** A run to record. */
export interface NewRun {
  taskKey: string;
  trigger: TaskTrigger;
  triggeredBy?: string | null;
  source?: string | null;
  payload?: unknown;
  /** The job that runs it, when known already (a schedule's tick). */
  jobId?: string | null;
}

/** A recorded trigger: the run, or the skipped run when another one was active. */
export interface Claim {
  runId: number;
  skipped: boolean;
}

/** A run that's starting: what its handler gets. */
export interface StartedRun {
  taskKey: string;
  trigger: TaskTrigger;
  triggeredBy: string | null;
  source: string | null;
  payload: unknown;
  timeoutSeconds: number | null;
}

/** A queued or running run. */
export interface ActiveRun {
  id: number;
  taskKey: string;
  jobId: string | null;
  queuedAt: Date;
}

/** Why a run failed. */
export interface RunError {
  message: string;
  stack?: string | null;
}

/** Turns what a handler returned into JSON (null when it can't be). */
export function toJson(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return null;
  }
}

const active = inArray(taskRun.status, [...ACTIVE_TASK_RUN_STATUSES]);

const runColumns = {
  id: taskRun.id,
  taskKey: taskRun.taskKey,
  status: taskRun.status,
  trigger: taskRun.trigger,
  triggeredById: taskRun.triggeredBy,
  triggeredByName: user.name,
  source: taskRun.source,
  error: taskRun.error,
  queuedAt: taskRun.queuedAt,
  startedAt: taskRun.startedAt,
  finishedAt: taskRun.finishedAt,
};

/** A run as selected with runColumns (its user's name from a left join). */
interface RunRow extends Omit<TaskRun, 'triggeredBy'> {
  triggeredById: string | null;
  triggeredByName: string | null;
}

function toRun({ triggeredById, triggeredByName, ...row }: RunRow): TaskRun {
  return {
    ...row,
    triggeredBy: triggeredById && triggeredByName !== null ? { id: triggeredById, name: triggeredByName } : null,
  };
}

/**
 * The runs of the tasks ("tasks"."task_run") and their logs: the only
 * writer of them. At most one run of a task is queued or running: a
 * trigger meanwhile is recorded as skipped (`claim`).
 */
@Injectable()
export class TaskRuns {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Records a trigger: a queued run, or a skipped one when the task has
   * a queued or running run already. A 404 if the task isn't known.
   */
  async claim(run: NewRun): Promise<Claim> {
    const values = {
      taskKey: run.taskKey,
      trigger: run.trigger,
      triggeredBy: run.triggeredBy ?? null,
      source: run.source ?? null,
      payload: toJson(run.payload),
      jobId: run.jobId ?? null,
    };
    try {
      const [row] = await this.db
        .insert(taskRun)
        .values({ ...values, status: 'queued' })
        .returning({ id: taskRun.id });
      return { runId: row.id, skipped: false };
    } catch (error) {
      const pg = postgresError(error);
      if (pg?.code === PostgresErrorCode.UNIQUE_VIOLATION && pg.constraint === ACTIVE_RUN_INDEX) {
        const [row] = await this.db
          .insert(taskRun)
          .values({ ...values, status: 'skipped', finishedAt: new Date() })
          .returning({ id: taskRun.id });
        return { runId: row.id, skipped: true };
      }
      if (pg?.code === PostgresErrorCode.FOREIGN_KEY_VIOLATION) {
        throw new NotFoundException(msg('tasks.notFound'));
      }
      throw error;
    }
  }

  /** Records the job that runs `runId`. */
  async setJob(runId: number, jobId: string): Promise<void> {
    await this.db.update(taskRun).set({ jobId }).where(eq(taskRun.id, runId));
  }

  /**
   * Marks the run as running, or returns undefined when it's over already
   * (failed as lost meanwhile). A run found running again (its job was
   * stalled and retried) starts over.
   */
  async start(runId: number): Promise<StartedRun | undefined> {
    const [row] = await this.db
      .update(taskRun)
      .set({ status: 'running', startedAt: new Date() })
      .where(and(eq(taskRun.id, runId), active))
      .returning({
        taskKey: taskRun.taskKey,
        trigger: taskRun.trigger,
        triggeredBy: taskRun.triggeredBy,
        source: taskRun.source,
        payload: taskRun.payload,
      });
    if (!row) {
      return undefined;
    }
    const [settings] = await this.db
      .select({ timeoutSeconds: task.timeoutSeconds })
      .from(task)
      .where(eq(task.key, row.taskKey));
    return { ...row, timeoutSeconds: settings?.timeoutSeconds ?? null };
  }

  /** Ends a running run well, with what its handler returned. */
  async succeed(runId: number, result: unknown): Promise<void> {
    await this.db
      .update(taskRun)
      .set({ status: 'succeeded', result: toJson(result), finishedAt: new Date() })
      .where(and(eq(taskRun.id, runId), eq(taskRun.status, 'running')));
  }

  /** Fails a queued or running run (a finished one stays as it is). */
  async fail(runId: number, error: RunError): Promise<void> {
    await this.db
      .update(taskRun)
      .set({ status: 'failed', error: error.message, errorStack: error.stack ?? null, finishedAt: new Date() })
      .where(and(eq(taskRun.id, runId), active));
  }

  /** Adds a line to the run's log. */
  async log(runId: number, level: TaskLogLevel, message: string, data?: unknown): Promise<void> {
    await this.db.insert(taskRunLog).values({ runId, level, message, data: toJson(data) });
  }

  /** The queued and running runs. */
  active(): Promise<ActiveRun[]> {
    return this.db
      .select({ id: taskRun.id, taskKey: taskRun.taskKey, jobId: taskRun.jobId, queuedAt: taskRun.queuedAt })
      .from(taskRun)
      .where(active);
  }

  /** Deletes the finished runs (and their logs) queued before `date`; returns how many. */
  async deleteFinishedBefore(date: Date): Promise<number> {
    const rows = await this.db
      .delete(taskRun)
      .where(and(lt(taskRun.queuedAt, date), notInArray(taskRun.status, [...ACTIVE_TASK_RUN_STATUSES])))
      .returning({ id: taskRun.id });
    return rows.length;
  }

  /** The latest run of each of `keys`. */
  async latest(keys: string[]): Promise<Map<string, TaskRun>> {
    if (!keys.length) {
      return new Map();
    }
    const rows = await this.db
      .selectDistinctOn([taskRun.taskKey], runColumns)
      .from(taskRun)
      .leftJoin(user, eq(user.id, taskRun.triggeredBy))
      .where(inArray(taskRun.taskKey, keys))
      .orderBy(taskRun.taskKey, desc(taskRun.id));
    return new Map(rows.map((row) => [row.taskKey, toRun(row)]));
  }

  /** A task's runs, newest first. */
  async list(taskKey: string, query: ListTaskRunsQuery): Promise<TaskRunsList> {
    const limit = query.limit ?? TASK_RUNS_DEFAULT_PAGE_SIZE;
    const offset = query.offset ?? 0;
    const filters: SQL[] = [eq(taskRun.taskKey, taskKey)];
    if (query.status) {
      filters.push(eq(taskRun.status, query.status));
    }
    const where = and(...filters);
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select(runColumns)
        .from(taskRun)
        .leftJoin(user, eq(user.id, taskRun.triggeredBy))
        .where(where)
        .orderBy(desc(taskRun.id))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(taskRun).where(where),
    ]);
    return { items: items.map(toRun), total, limit, offset };
  }

  /** A run with its log; a 404 if there's none. */
  async get(runId: number): Promise<TaskRunDetail> {
    const [row] = await this.db
      .select({
        ...runColumns,
        payload: taskRun.payload,
        result: taskRun.result,
        errorStack: taskRun.errorStack,
      })
      .from(taskRun)
      .leftJoin(user, eq(user.id, taskRun.triggeredBy))
      .where(eq(taskRun.id, runId));
    if (!row) {
      throw new NotFoundException(msg('tasks.run.notFound'));
    }
    const { payload, result, errorStack, ...run } = row;
    const logs = await this.db
      .select({
        id: taskRunLog.id,
        at: taskRunLog.at,
        level: taskRunLog.level,
        message: taskRunLog.message,
        data: taskRunLog.data,
      })
      .from(taskRunLog)
      .where(eq(taskRunLog.runId, runId))
      .orderBy(asc(taskRunLog.id));
    return { ...toRun(run), payload, result, errorStack, logs };
  }
}
