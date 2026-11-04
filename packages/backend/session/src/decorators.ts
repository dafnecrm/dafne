import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { UserSession } from './session.types.js';

export const ALLOW_ANONYMOUS = 'dafne:allow-anonymous';
export const OPTIONAL_AUTH = 'dafne:optional-auth';
export const ROLES = 'dafne:roles';

/** The request's session (set by SessionGuard). */
export const Session = createParamDecorator(
  (_: unknown, context: ExecutionContext): UserSession | undefined =>
    context.switchToHttp().getRequest<{ session?: UserSession }>().session,
);

/** No session needed. */
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS, true);

/** A session if there is one (`@Session()` may be undefined). */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH, true);

/**
 * Only users with one of these roles in this app (app_access.role), or
 * global admins.
 */
export const Roles = (roles: string[]) => SetMetadata(ROLES, roles);
