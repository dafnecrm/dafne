import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisConnection } from './redis.js';
import { TaskRuns } from './task-runs.js';
import { TasksClient } from './tasks.client.js';
import { TASKS_QUEUE, TASKS_QUEUE_PREFIX } from './tasks.constants.js';

/**
 * The tasks' queue (BullMQ, Redis at REDIS_URL) and TasksClient, to start
 * tasks from any backend. Needs the app's DatabaseModule (the runs are
 * recorded in the tasks schema). TasksModule imports it.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnection(config.get<string>('REDIS_URL')),
        prefix: TASKS_QUEUE_PREFIX,
      }),
    }),
    BullModule.registerQueue({ name: TASKS_QUEUE }),
  ],
  providers: [TaskRuns, TasksClient],
  exports: [TaskRuns, TasksClient, BullModule],
})
export class TasksClientModule {}
