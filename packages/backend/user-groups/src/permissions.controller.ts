import { Controller, Get } from '@nestjs/common';
import { Session, type UserSession } from '@dafne/backend-session';
import type { MyPermissions } from '@dafne/contracts';
import { PermissionsService } from './permissions.service.js';

/** What the signed-in user can do, for the frontend (it hides what they can't). */
@Controller('me')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get('permissions')
  mine(@Session() session: UserSession): Promise<MyPermissions> {
    return this.permissions.of(session.user);
  }
}
