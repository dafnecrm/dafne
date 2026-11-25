import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Task } from './task.decorator.js';
import { TaskRuns } from './task-runs.js';
import type { TaskContext, TaskHandler } from './task.types.js';
import { TasksScheduler } from './tasks.scheduler.js';

/** Finished runs are kept this many days, unless TASKS_RETENTION_DAYS says. */
export const DEFAULT_RETENTION_DAYS = 30;

/** The tasks' own housekeeping: fails lost runs, deletes old ones. */
@Task({ key: 'tasks.cleanup', cron: '0 3 * * *', timeoutSeconds: 600 })
@Injectable()
export class TasksCleanupTask implements TaskHandler<unknown, { lost: number; deleted: number }> {
  constructor(
    private readonly runs: TaskRuns,
    private readonly scheduler: TasksScheduler,
    private readonly config: ConfigService,
  ) {}

  async run(ctx: TaskContext): Promise<{ lost: number; deleted: number }> {
    const lost = await this.scheduler.reconcile();
    if (lost) {
      await ctx.log.warn(`Failed ${lost} lost runs`);
    }
    const configured = Number(this.config.get<string>('TASKS_RETENTION_DAYS'));
    const days = Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_RETENTION_DAYS;
    const deleted = await this.runs.deleteFinishedBefore(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
    await ctx.log.info(`Deleted ${deleted} runs older than ${days} days`);
    return { lost, deleted };
  }
}
