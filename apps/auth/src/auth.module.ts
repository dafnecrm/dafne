import { Logger, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule, type CacheModuleOptions } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  I18nExceptionFilter,
  PostgresErrorInterceptor,
} from '@dafne/backend-common';
import { AuthDatabaseModule } from '@dafne/backend-database-auth';
import { AuthModule as BetterAuthModule } from '@dafne/backend-auth';
import { UsersModule } from '@dafne/backend-users';
import { UserGroupsModule } from '@dafne/backend-user-groups';
import { LoggerModule } from '@dafne/backend-logger';
import { AuthController } from './auth.controller.js';

/**
 * The sign-in of every Dafne app: Better Auth (/api/auth/*), the users
 * (/users), the apps they can use (app_access) and their groups
 * (/user-groups), on the auth schema. The apps'
 * frontends proxy /api/auth here; their APIs check sessions through
 * @dafne/backend-session.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    // pino: request lines and every Nest Logger, configured by LOG_*.
    LoggerModule.forRoot({ app: 'auth' }),
    // The cache the apps share (CACHE_MANAGER): Redis at REDIS_URL, with
    // the apps' namespace, so a change to a group drops their cached
    // permissions (PermissionsVersion). Memory without it: then the apps
    // see the change when their cache expires (a minute).
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CacheModuleOptions => {
        const url = config.get<string>('REDIS_URL');
        if (!url) {
          return {};
        }
        const redis = createKeyv(url, { namespace: 'dafne' });
        // Without a listener, a Redis error would crash the process.
        redis.on('error', (error: unknown) =>
          new Logger('Cache').warn(`Redis: ${String(error)}`),
        );
        return { stores: [redis] };
      },
    }),
    AuthDatabaseModule,
    BetterAuthModule,
    UsersModule,
    UserGroupsModule,
  ],
  controllers: [AuthController],
  providers: [
    // Errors in the request's language (Accept-Language).
    { provide: APP_FILTER, useClass: I18nExceptionFilter },
    // Constraint errors no service handled: a 409 or 400, not a 500.
    { provide: APP_INTERCEPTOR, useClass: PostgresErrorInterceptor },
  ],
})
export class AuthModule {}
