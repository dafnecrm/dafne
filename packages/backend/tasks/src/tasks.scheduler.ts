import type { Database } from '@dafne/backend-database';
import { task } from '@dafne/backend-database-tasks';
import { msg } from '@dafne/contracts';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { TaskRuns } from './task-runs.js';
import { DEFAULT_TIMEZONE, LOST_AFTER_MS, schedulerId, TASKS_QUEUE, type TaskJobData } from './tasks.constants.js';
import { TasksRegistry } from './tasks.registry.js';

/** States of a job that's no longer running a run. */
const OVER = new Set(['completed', 'failed', 'unknown']);

/**
 * The tasks' schedules: their settings ("tasks"."task", where admins change
 * them) become BullMQ job schedulers (cron, in Redis), which fire once
 * however many instances run.
 *
 * At startup it writes the settings of every task in code (the code's
 * defaults, until an admin changes them), syncs the schedulers and fails
 * the runs whose job was lost.
 */
@Injectable()
export class TasksScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(TasksScheduler.name);

  constructor(
    @InjectDrizzle() private readonly db: Database,
    @InjectQueue(TASKS_QUEUE) private readonly queue: Queue<TaskJobData>,
    private readonly registry: TasksRegistry,
    private readonly runs: TaskRuns,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.register();
    await this.syncAll();
    await this.reconcile();
  }

  /** Writes each task's row; the code's defaults replace those an admin hasn't changed. */
  async register(): Promise<void> {
    for (const { options } of this.registry.all()) {
      const defaults = {
        cron: options.cron ?? null,
        timezone: options.timezone ?? DEFAULT_TIMEZONE,
        enabled: options.enabled ?? true,
        timeoutSeconds: options.timeoutSeconds ?? null,
      };
      await this.db
        .insert(task)
        .values({ key: options.key, ...defaults })
        .onConflictDoUpdate({ target: task.key, set: defaults, setWhere: eq(task.customized, false) });
    }
  }

  /** Brings the scheduler of `key` in line with its settings: on with a cron pattern, else off. */
  async sync(key: string): Promise<void> {
    const [settings] = await this.db.select().from(task).where(eq(task.key, key));
    const id = schedulerId(key);
    if (settings && settings.enabled && settings.cron && this.registry.has(key)) {
      await this.queue.upsertJobScheduler(
        id,
        { pattern: settings.cron, tz: settings.timezone },
        { name: key, data: { taskKey: key }, opts: { removeOnComplete: true, removeOnFail: true } },
      );
    } else {
      await this.queue.removeJobScheduler(id);
    }
  }

  /** Syncs every task's scheduler, and removes those of tasks no longer in code. */
  async syncAll(): Promise<void> {
    for (const { options } of this.registry.all()) {
      await this.sync(options.key);
    }
    const known = new Set(this.registry.all().map(({ options }) => schedulerId(options.key)));
    for (const scheduler of await this.queue.getJobSchedulers()) {
      if (!known.has(scheduler.key)) {
        await this.queue.removeJobScheduler(scheduler.key);
        this.logger.log(`Removed the schedule ${scheduler.key}: no such task`);
      }
    }
  }

  /** When the schedule of `key` fires next, or null without one. */
  async nextRunAt(key: string): Promise<Date | null> {
    const scheduler = await this.queue.getJobScheduler(schedulerId(key));
    return scheduler?.next ? new Date(scheduler.next) : null;
  }

  /**
   * Fails the queued or running runs whose job is gone or over (the app
   * stopped mid-run, Redis lost it), so they don't block their task
   * forever. Runs younger than LOST_AFTER_MS are left alone: their job
   * may be on its way. Returns how many it failed.
   */
  async reconcile(now = new Date()): Promise<number> {
    let lost = 0;
    for (const run of await this.runs.active()) {
      if (now.getTime() - run.queuedAt.getTime() < LOST_AFTER_MS) {
        continue;
      }
      const job = run.jobId ? await this.queue.getJob(run.jobId) : undefined;
      if (job && !OVER.has(await job.getState())) {
        continue;
      }
      await this.runs.fail(run.id, { message: msg('tasks.run.workerLost') });
      this.logger.warn(`Task ${run.taskKey}: run ${run.id} lost its job, failed`);
      lost++;
    }
    return lost;
  }
}
