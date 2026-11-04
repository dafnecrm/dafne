import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { relations } from './schema.js';

/** The migrations of libs/database/src/migrations, applied on startup. */
export const MIGRATIONS = {
  migrationsFolder: 'libs/database/src/migrations',
  migrationsTable: '_migrations',
};

/**
 * The MySQL database, through @nestjs/drizzle: inject it with
 * `@InjectDrizzle() private readonly db: Database`. The pending migrations
 * are applied before the database is handed to anyone (Better Auth, the
 * services…), and the module closes the pool on shutdown.
 */
@Module({
  imports: [
    // Global: the database is injectable everywhere.
    DrizzleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const db = drizzle({
          connection: config.getOrThrow<string>('DATABASE_URL'),
          relations,
        });

        await migrate(db, MIGRATIONS);
        new Logger('DatabaseModule').log('Migrations applied');

        return { db };
      },
    }),
  ],
})
export class DatabaseModule {}
