import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool } from 'mysql2';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { relations, type Database } from './schema.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;
  readonly db: Database;

  constructor(config: ConfigService) {
    // The pool is lazy: no connection is opened until the first query.
    // Creating the instance here lets other providers (e.g. Better Auth) receive it at construction time.
    this.pool = createPool(config.getOrThrow<string>('DATABASE_URL'));
    this.db = drizzle({ client: this.pool, relations });
  }

  async onModuleInit() {
    await migrate(this.db, {
      migrationsFolder: 'libs/database/src/migrations',
      migrationsTable: '_migrations',
    });

    this.logger.log('Database connected and migrations applied');
  }

  async onModuleDestroy() {
    await new Promise<void>((resolve, reject) =>
      this.pool.end((err) => (err ? reject(err) : resolve())),
    );
  }
}
