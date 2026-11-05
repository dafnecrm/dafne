import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { postgresUrl } from '@dafne/backend-database-auth';
import { relations } from './schema.js';

/**
 * The Postgres database (the sales schema, and the auth tables it points
 * to), through @nestjs/drizzle: inject it with
 * `@InjectDrizzle() private readonly db: Database`. The module closes the
 * pool on shutdown.
 *
 * It doesn't migrate: @dafne/backend-migrator applies the migrations of
 * every schema, in one order, before the apps start (`pnpm dafne db
 * migrate`; `dafne dev` runs it first).
 */
@Module({
  imports: [
    // Global: the database is injectable everywhere.
    DrizzleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        db: drizzle({
          connection: postgresUrl(config.getOrThrow<string>('DATABASE_URL')),
          relations,
        }),
      }),
    }),
  ],
})
export class DatabaseModule {}
