import { useAppLogger } from '@dafne/backend-logger';
import { migrateOnStart } from '@dafne/backend-migrator/start';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { SalesTasksModule } from './sales-tasks.module.js';

async function bootstrap() {
  // MIGRATE_ON_START=true: every database's migrations first (copied into dist/ by the build).
  const logger = new Logger('Migrations');
  await migrateOnStart({
    migrations: join(import.meta.dirname, 'migrations'),
    log: (line) => logger.log(line),
  });

  // bufferLogs: what Nest logs while starting waits for pino (LoggerModule).
  const app = await NestFactory.create(SalesTasksModule, { bufferLogs: true });
  useAppLogger(app);
  // SIGTERM closes the worker: the runs in progress end before the app does.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3002);
}
await bootstrap();
