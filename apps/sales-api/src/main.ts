import { useAppLogger } from '@dafne/backend-logger';
import { migrateOnStart } from '@dafne/backend-migrator/start';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { SalesApiModule } from './sales-api.module.js';

async function bootstrap() {
  // MIGRATE_ON_START=true: every database's migrations first (copied into dist/ by the build).
  const logger = new Logger('Migrations');
  await migrateOnStart({
    migrations: join(import.meta.dirname, 'migrations'),
    log: (line) => logger.log(line),
  });

  // Sign-in is apps/auth's: this API checks the session (@dafne/backend-session).
  // bufferLogs: what Nest logs while starting waits for pino (LoggerModule).
  const app = await NestFactory.create(SalesApiModule, { bufferLogs: true });
  useAppLogger(app);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
