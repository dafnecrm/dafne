import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TasksCleanupTask } from './cleanup.task.js';
import { TasksClientModule } from './tasks-client.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksRegistry } from './tasks.registry.js';
import { TasksScheduler } from './tasks.scheduler.js';
import { TasksService } from './tasks.service.js';
import { TasksWorker } from './tasks.worker.js';
import { QuotationsExpiryTask } from './quotations/quotations-expiry.task.ts';

/**
 * The tasks app's side (apps/sales-tasks): the worker that runs the
 * tasks found in the app (`@Task` providers), their schedules, and the
 * admins' API (/tasks, /task-runs). Only one app imports it; the others
 * start tasks with TasksClientModule.
 */
@Module({
  imports: [DiscoveryModule, TasksClientModule],
  controllers: [TasksController],
  providers: [TasksRegistry, TasksScheduler, TasksService, TasksWorker, TasksCleanupTask, QuotationsExpiryTask],
  exports: [TasksClientModule],
})
export class TasksModule {}
