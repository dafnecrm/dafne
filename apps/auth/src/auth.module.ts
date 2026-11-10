import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import {
  I18nExceptionFilter,
  PostgresErrorInterceptor,
} from '@dafne/backend-common';
import { AuthDatabaseModule } from '@dafne/backend-database-auth';
import { AuthModule as BetterAuthModule } from '@dafne/backend-auth';
import { UsersModule } from '@dafne/backend-users';
import { AuthController } from './auth.controller.js';

/**
 * The sign-in of every Dafne app: Better Auth (/api/auth/*), the users
 * (/users) and the apps they can use (app_access), on the auth schema. The apps'
 * frontends proxy /api/auth here; their APIs check sessions through
 * @dafne/backend-session.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    AuthDatabaseModule,
    BetterAuthModule,
    UsersModule,
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
