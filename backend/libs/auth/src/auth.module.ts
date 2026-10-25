import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseModule, DatabaseService } from '@app/database';
import { createAuth } from './auth.js';

@Module({
  imports: [
    DatabaseModule,
    BetterAuthModule.forRootAsync({
      imports: [DatabaseModule],
      inject: [DatabaseService, ConfigService],
      useFactory: (database: DatabaseService, config: ConfigService) => ({
        auth: createAuth(database.db, {
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          baseURL: config.get<string>('BETTER_AUTH_URL'),
          trustedOrigins: config.get<string>('TRUSTED_ORIGINS')?.split(','),
        }),
      }),
    }),
  ],
})
export class AuthModule {}
