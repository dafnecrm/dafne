import { DiscoveryService } from '@nestjs/core';
import type { TaskOptions } from './task.types.js';

/**
 * Marks a provider as a task's handler (it implements TaskHandler):
 *
 *   @Task({ key: 'quotations.expire', cron: '0 2 * * *' })
 *   @Injectable()
 *   export class ExpireQuotationsTask implements TaskHandler { … }
 *
 * The tasks app (TasksModule) finds it among its providers: list it in
 * a module that app imports.
 */
export const Task = DiscoveryService.createDecorator<TaskOptions>();
