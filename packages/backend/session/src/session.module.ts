import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SessionClient } from './session.client.js';
import { SESSION_OPTIONS, SessionGuard, type SessionOptions } from './session.guard.js';

/**
 * Sign-in for an app's API, without Better Auth in it: SessionGuard (global)
 * asks apps/auth (AUTH_URL, default http://localhost:3001) for the session
 * of the request's cookie, and lets in the users of this app.
 *
 *   SessionModule.forRoot({ app: 'crm' })
 */
@Module({})
export class SessionModule {
  static forRoot(options: SessionOptions): DynamicModule {
    return {
      module: SessionModule,
      providers: [
        { provide: SESSION_OPTIONS, useValue: options },
        SessionClient,
        { provide: APP_GUARD, useClass: SessionGuard },
      ],
      exports: [SessionClient],
    };
  }
}
