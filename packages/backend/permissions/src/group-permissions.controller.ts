import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { Roles } from '@dafne/backend-session';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  groupPermissionsBodySchema,
  type GroupPermissions,
  type GroupPermissionsBody,
} from '@dafne/contracts';
import { GroupPermissionsService } from './group-permissions.service.js';

/**
 * What a user group can do in this app: admins only (of the app, or
 * global). The groups and their members are on apps/auth (/user-groups).
 */
@Roles(['admin'])
@Controller('user-groups/:id/permissions')
export class GroupPermissionsController {
  constructor(private readonly groupPermissions: GroupPermissionsService) {}

  @Get()
  get(@Param('id', IdPipe) id: number): Promise<GroupPermissions> {
    return this.groupPermissions.get(id);
  }

  /** Replaces the whole list. */
  @Put()
  replace(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(groupPermissionsBodySchema)) body: GroupPermissionsBody,
  ): Promise<GroupPermissions> {
    return this.groupPermissions.replace(id, body);
  }
}
