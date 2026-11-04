import { migrateOnStart } from '@dafne/backend-migrator/start';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { AuthModule } from './auth.module.js';

async function bootstrap() {
  // MIGRATE_ON_START=true: every database's migrations first (copied into dist/ by the build).
  const logger = new Logger('Migrations');
  await migrateOnStart({
    migrations: join(import.meta.dirname, 'migrations'),
    log: (line) => logger.log(line),
  });

  const app = await NestFactory.create(AuthModule, {
    // Better Auth needs the raw body; its module re-adds parsers for other routes.
    bodyParser: false,
  });
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
