import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AuthDatabaseModule, type AuthDatabase } from '@dafne/backend-database-auth';
import { getDrizzleToken } from '@nestjs/drizzle';
import { ChangelogModule, ChangelogService } from '@dafne/backend-changelog';
import { createAuth } from './auth.js';
import { AuthService } from './auth.service.js';
import { userChangelog } from './user-changelog.js';

/** A comma-separated variable as a list (empty items dropped). */
const list = (value: string | undefined) => value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];

@Module({
  imports: [
    AuthDatabaseModule,
    BetterAuthModule.forRootAsync({
      imports: [AuthDatabaseModule, ChangelogModule],
      inject: [getDrizzleToken(), ConfigService, ChangelogService],
      useFactory: (db: AuthDatabase, config: ConfigService, changelog: ChangelogService) => ({
        auth: createAuth(db, {
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          baseURL: config.get<string>('BETTER_AUTH_URL'),
          // DEV_AUTH_ALLOWED_HOSTS: the hosts `dafne dev` serves (with the port it got).
          allowedHosts: [
            ...list(config.get<string>('AUTH_ALLOWED_HOSTS')),
            ...list(config.get<string>('DEV_AUTH_ALLOWED_HOSTS')),
          ],
          trustedOrigins: list(config.get<string>('TRUSTED_ORIGINS')),
          resendApiKey: config.getOrThrow<string>('RESEND_API_KEY'),
          cookieDomain: config.get<string>('COOKIE_DOMAIN') || undefined,
          defaultApps: list(config.get<string>('DEFAULT_APPS')),
          changelog: userChangelog(changelog, db),
        }),
      }),
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
