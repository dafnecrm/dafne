import { msg, type TaskLogLevel } from '@dafne/contracts';
import type { Database } from '@dafne/backend-database';
import { task } from '@dafne/backend-database-tasks';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { TaskRuns, type StartedRun } from './task-runs.js';
import type { TaskContext, TaskLogger } from './task.types.js';
import { TASKS_QUEUE, type TaskJobData } from './tasks.constants.js';
import { TasksRegistry } from './tasks.registry.js';

/** How many runs (of different tasks) one worker makes at once, unless TASKS_CONCURRENCY says. */
export const DEFAULT_CONCURRENCY = 4;

const LEVELS: TaskLogLevel[] = ['debug', 'info', 'warn', 'error'];

/** Thrown when a run takes longer than its task's timeout. */
class TaskTimeoutError extends Error {}

/**
 * Runs the jobs of the tasks' queue: a run TasksClient recorded, or a tick
 * of a task's schedule (recorded here, or skipped when the task has a run
 * already). The run's outcome goes in "tasks"."task_run": the job itself
 * always completes, and BullMQ keeps nothing.
 */
@Processor(TASKS_QUEUE)
export class TasksWorker extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(TasksWorker.name);

  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly runs: TaskRuns,
    private readonly registry: TasksRegistry,
    private readonly config: ConfigService,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    const concurrency = Number(this.config.get<string>('TASKS_CONCURRENCY'));
    this.worker.concurrency = Number.isInteger(concurrency) && concurrency > 0 ? concurrency : DEFAULT_CONCURRENCY;
  }

  async process(job: Job<TaskJobData>): Promise<void> {
    const { taskKey } = job.data;
    let runId = job.data.runId;
    if (runId === undefined) {
      // A tick of the schedule: the task may have been turned off since.
      const [settings] = await this.db.select({ enabled: task.enabled }).from(task).where(eq(task.key, taskKey));
      if (!settings?.enabled) {
        return;
      }
      const claim = await this.runs.claim({ taskKey, trigger: 'schedule', jobId: job.id ?? null });
      if (claim.skipped) {
        this.logger.log(`Task ${taskKey}: skipped, a run is still active`);
        return;
      }
      runId = claim.runId;
    }
    await this.execute(runId, taskKey);
  }

  /** Makes a recorded run, saving its outcome. Never throws. */
  async execute(runId: number, taskKey: string): Promise<void> {
    const registered = this.registry.get(taskKey);
    if (!registered) {
      await this.runs.fail(runId, { message: msg('tasks.run.unknownTask') });
      return;
    }
    const run = await this.runs.start(runId);
    if (!run) {
      return;
    }
    const controller = new AbortController();
    const ctx = this.context(runId, taskKey, run, controller.signal);
    const started = Date.now();
    let timer: NodeJS.Timeout | undefined;
    this.logger.log(`Task ${taskKey}: run ${runId} started (${run.trigger})`);
    try {
      const work = registered.handler.run(ctx);
      let result: unknown;
      if (run.timeoutSeconds) {
        // After a timeout the handler's own failure has no one to catch it.
        work.catch(() => undefined);
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new TaskTimeoutError());
          }, run.timeoutSeconds! * 1000);
        });
        result = await Promise.race([work, timeout]);
      } else {
        result = await work;
      }
      await this.runs.succeed(runId, result);
      this.logger.log(`Task ${taskKey}: run ${runId} succeeded in ${Date.now() - started} ms`);
    } catch (error) {
      if (error instanceof TaskTimeoutError) {
        await this.runs.fail(runId, { message: msg('tasks.run.timedOut') });
        this.logger.error(`Task ${taskKey}: run ${runId} timed out after ${run.timeoutSeconds} s`);
      } else {
        const failure = error instanceof Error ? error : new Error(String(error));
        await this.runs.fail(runId, { message: failure.message, stack: failure.stack ?? null });
        this.logger.error(`Task ${taskKey}: run ${runId} failed: ${failure.message}`, failure.stack);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  private context(runId: number, key: string, run: StartedRun, signal: AbortSignal): TaskContext {
    const logger = new Logger(`Task ${key}`);
    const log = Object.fromEntries(
      LEVELS.map((level) => [
        level,
        async (message: string, data?: unknown) => {
          logger[level === 'info' ? 'log' : level](`run ${runId}: ${message}`);
          try {
            await this.runs.log(runId, level, message, data);
          } catch (error) {
            logger.warn(`run ${runId}: log line not saved: ${String(error)}`);
          }
        },
      ]),
    ) as TaskLogger;
    return {
      key,
      runId,
      trigger: run.trigger,
      triggeredBy: run.triggeredBy,
      source: run.source,
      payload: run.payload,
      signal,
      log,
    };
  }

  @OnWorkerEvent('error')
  onError(error: Error): void {
    // Redis errors: without a listener they would crash the process.
    this.logger.warn(`Worker: ${error.message}`);
  }
}
