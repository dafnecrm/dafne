import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_ANONYMOUS, OPTIONAL_AUTH, ROLES } from './decorators.js';
import { SessionClient } from './session.client.js';
import type { UserSession } from './session.types.js';

export const SESSION_OPTIONS = Symbol('SESSION_OPTIONS');

export interface SessionOptions {
  /** This app's name in app_access (e.g. sales): its users get in. */
  app: string;
}

interface SessionRequest {
  headers: Record<string, string | string[] | undefined>;
  session?: UserSession;
  user?: UserSession['user'];
}

/**
 * Global guard: every route needs a session from apps/auth, for a user who
 * can use this app (`app` in their apps, or a global admin), unless it's
 * marked @AllowAnonymous() or @OptionalAuth(). @Roles() narrows it to the
 * user's role in this app.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  private readonly app: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionClient,
    @Inject(SESSION_OPTIONS) options: SessionOptions,
  ) {
    this.app = options.app;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const anonymous = this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS, targets);
    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH, targets);
    const roles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES, targets);

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const cookie = request.headers.cookie;
    const session = typeof cookie === 'string' && cookie ? await this.sessions.get(cookie) : null;

    if (!session) {
      if (anonymous || optional) return true;
      throw new UnauthorizedException();
    }

    const { user } = session;
    const admin = user.role === 'admin';
    const appRole = user.apps?.[this.app];
    if (!admin && !appRole && !anonymous) throw new ForbiddenException(`No access to ${this.app}.`);
    if (roles?.length && !admin && !(appRole && roles.includes(appRole))) throw new ForbiddenException();

    request.session = session;
    request.user = user;
    return true;
  }
}
