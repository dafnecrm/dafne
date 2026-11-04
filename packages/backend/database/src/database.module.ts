import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/mysql2';
import { relations } from './schema.js';

/**
 * The MySQL database (dafne_crm), through @nestjs/drizzle: inject it with
 * `@InjectDrizzle() private readonly db: Database`. The module closes the
 * pool on shutdown.
 *
 * It doesn't migrate: @dafne/backend-migrator applies the migrations of
 * every database, in one order, before the apps start (`pnpm dafne db
 * migrate`; `dafne dev` runs it first).
 */
@Module({
  imports: [
    // Global: the database is injectable everywhere.
    DrizzleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        db: drizzle({
          connection: config.getOrThrow<string>('DATABASE_URL'),
          relations,
        }),
      }),
    }),
  ],
})
export class DatabaseModule {}
