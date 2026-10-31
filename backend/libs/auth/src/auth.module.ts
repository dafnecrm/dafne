import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseModule, type Database } from '@app/database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { createAuth } from './auth.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    DatabaseModule,
    BetterAuthModule.forRootAsync({
      imports: [DatabaseModule],
      inject: [getDrizzleToken(), ConfigService],
      useFactory: (db: Database, config: ConfigService) => ({
        auth: createAuth(db, {
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          baseURL: config.get<string>('BETTER_AUTH_URL'),
          trustedOrigins: config.get<string>('TRUSTED_ORIGINS')?.split(','),
          resendApiKey: config.getOrThrow<string>('RESEND_API_KEY'),
        }),
      }),
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
