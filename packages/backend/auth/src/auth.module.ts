import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AuthDatabaseModule, type AuthDatabase } from '@dafne/backend-database-auth';
import { getDrizzleToken } from '@nestjs/drizzle';
import { createAuth } from './auth.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    AuthDatabaseModule,
    BetterAuthModule.forRootAsync({
      imports: [AuthDatabaseModule],
      inject: [getDrizzleToken(), ConfigService],
      useFactory: (db: AuthDatabase, config: ConfigService) => ({
        auth: createAuth(db, {
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          baseURL: config.get<string>('BETTER_AUTH_URL'),
          trustedOrigins: config.get<string>('TRUSTED_ORIGINS')?.split(','),
          resendApiKey: config.getOrThrow<string>('RESEND_API_KEY'),
          cookieDomain: config.get<string>('COOKIE_DOMAIN') || undefined,
          defaultApps: config.get<string>('DEFAULT_APPS')?.split(',').filter(Boolean) ?? [],
        }),
      }),
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
