import type { Database } from '@dafne/backend-database';
import { task } from '@dafne/backend-database-tasks';
import { msg } from '@dafne/contracts';
import { InjectQueue } from '@nestjs/bullmq';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { type Claim, TaskRuns } from './task-runs.js';
import { TASKS_QUEUE, type TaskJobData } from './tasks.constants.js';

/** How a run is started. */
export interface TriggerOptions {
  /** What the handler gets as `ctx.payload` (JSON). */
  payload?: unknown;
  /** The user it's started for, if any (e.g. `session.user`). */
  actor?: { id: string } | null;
  /** The app that starts it (e.g. `sales`). */
  source?: string | null;
  /** `api` (default): another backend; `manual`: an admin, from the tasks app. */
  trigger?: 'api' | 'manual';
}

/**
 * Starts tasks from any backend (TasksClientModule): records the run and
 * queues it for the tasks app (apps/sales-tasks), which runs it.
 *
 *   const { runId, skipped } = await tasks.trigger('quotations.expire', { actor: session.user, source: 'sales' });
 *
 * `skipped`: the task had a queued or running run already, so this one
 * was recorded as skipped and won't run. A 404 for an unknown task, a 409
 * for one that's turned off (API triggers only: admins may run it).
 */
@Injectable()
export class TasksClient {
  private readonly logger = new Logger(TasksClient.name);

  constructor(
    @InjectDrizzle() private readonly db: Database,
    @InjectQueue(TASKS_QUEUE) private readonly queue: Queue<TaskJobData>,
    private readonly runs: TaskRuns,
  ) {
    // Without a listener, a Redis error would crash the process.
    queue.on('error', (error: Error) => this.logger.warn(`Redis: ${error.message}`));
  }

  async trigger(key: string, options: TriggerOptions = {}): Promise<Claim> {
    const trigger = options.trigger ?? 'api';
    const [settings] = await this.db.select({ enabled: task.enabled }).from(task).where(eq(task.key, key));
    if (!settings) {
      throw new NotFoundException(msg('tasks.notFound'));
    }
    if (trigger === 'api' && !settings.enabled) {
      throw new ConflictException(msg('tasks.disabled'));
    }
    const claim = await this.runs.claim({
      taskKey: key,
      trigger,
      triggeredBy: options.actor?.id ?? null,
      source: options.source ?? null,
      payload: options.payload,
    });
    if (claim.skipped) {
      return claim;
    }
    const jobId = `run-${claim.runId}`;
    try {
      await this.runs.setJob(claim.runId, jobId);
      await this.queue.add(key, { taskKey: key, runId: claim.runId }, { jobId, removeOnComplete: true, removeOnFail: true });
    } catch (error) {
      // Not queued: free the task for the next trigger.
      await this.runs.fail(claim.runId, { message: String(error), stack: error instanceof Error ? error.stack : null });
      throw error;
    }
    return claim;
  }
}
