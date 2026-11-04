import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/mysql2';
import { authDatabaseRelations } from './schema.ts';

/**
 * dafne_auth, through @nestjs/drizzle, for the auth app (apps/auth) only:
 * inject it with `@InjectDrizzle() private readonly db: AuthDatabase`.
 * Global, like the apps' DatabaseModule: an app has one of them. It doesn't
 * migrate (@dafne/backend-migrator does).
 */
@Module({
  imports: [
    DrizzleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        db: drizzle({
          connection: config.getOrThrow<string>('DATABASE_URL'),
          relations: authDatabaseRelations,
        }),
      }),
    }),
  ],
})
export class AuthDatabaseModule {}
