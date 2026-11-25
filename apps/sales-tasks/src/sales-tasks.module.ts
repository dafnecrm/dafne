import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import {
  I18nExceptionFilter,
  PostgresErrorInterceptor,
} from '@dafne/backend-common';
import { DatabaseModule } from '@dafne/backend-database';
import { LoggerModule } from '@dafne/backend-logger';
import { SessionModule } from '@dafne/backend-session';
import { TasksModule } from '@dafne/backend-tasks';
import { SalesTasksController } from './sales-tasks.controller.js';

/**
 * The sales app's scheduled tasks: the BullMQ worker that runs them (Redis
 * at REDIS_URL), their schedules, and the admins' API (/tasks). Tasks are
 * the `@Task` providers of the modules imported here.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    // pino: request lines and every Nest Logger, configured by LOG_*.
    LoggerModule.forRoot({ app: 'sales-tasks' }),
    DatabaseModule,
    // The admins of the sales app (app_access: sales), signed in on apps/auth.
    SessionModule.forRoot({ app: 'sales' }),
    TasksModule,
  ],
  controllers: [SalesTasksController],
  providers: [
    // Errors in the request's language (Accept-Language).
    { provide: APP_FILTER, useClass: I18nExceptionFilter },
    // Constraint errors no service handled: a 409 or 400, not a 500.
    { provide: APP_INTERCEPTOR, useClass: PostgresErrorInterceptor },
  ],
})
export class SalesTasksModule {}
