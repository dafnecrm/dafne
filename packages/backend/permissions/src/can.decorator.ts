import {
  applyDecorators,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionUser } from '@dafne/backend-session';
import { msg, type PERMISSIONS, type PermissionAction, type PermissionSubject } from '@dafne/contracts';
import { PermissionsService } from './permissions.service.js';

export const CAN = 'dafne:can';

interface Required {
  action: PermissionAction;
  subject: PermissionSubject;
}

/**
 * Checks the permission @Can() asks for: 403 without it. Set on the route
 * (by @Can), so it runs after the global SessionGuard: the user is known.
 */
@Injectable()
export class AbilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Required | undefined>(CAN, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }
    const user = context.switchToHttp().getRequest<{ user?: SessionUser }>().user;
    if (!user) {
      throw new ForbiddenException();
    }
    const ability = await this.permissions.abilityFor(user);
    if (!ability.can(required.action, required.subject)) {
      throw new ForbiddenException(msg('permissions.forbidden'));
    }
    return true;
  }
}

/**
 * Only users whose groups allow `action` on `subject` (see
 * contracts/permissions.ts); admins always. The controller's module imports
 * PermissionsModule, which provides the guard.
 *
 *   @Post() @Can('create', 'Customer') create(...) {}
 */
export const Can = <S extends PermissionSubject>(
  // Only the actions the catalog has for this subject.
  action: (typeof PERMISSIONS)[S][number],
  subject: S,
) => applyDecorators(SetMetadata(CAN, { action, subject }), UseGuards(AbilityGuard));
