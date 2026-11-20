import { Controller, Get } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { MyUserGroup } from '@dafne/contracts';
import { UserGroupsService } from './user-groups.service.js';

/** Only the user matters here. */
interface Signed {
  user: { id: string };
}

/**
 * The signed-in user's own groups, for any user (e.g. their account page):
 * GET /user-groups is for admins only.
 */
@Controller('me')
export class MyUserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Get('user-groups')
  mine(@Session() session: Signed): Promise<MyUserGroup[]> {
    return this.userGroupsService.ofMember(session.user.id);
  }
}
