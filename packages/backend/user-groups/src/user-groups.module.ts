import { AuthDatabaseModule } from '@dafne/backend-database-auth';
import { Module } from '@nestjs/common';
import { MyUserGroupsController } from './my-user-groups.controller.js';
import { PermissionsVersion } from './permissions-version.js';
import { UserGroupsController } from './user-groups.controller.js';
import { UserGroupsService } from './user-groups.service.js';

/**
 * The user groups and their members (auth schema), for apps/auth. Needs
 * the app's global CacheModule, shared with the other apps (Redis): a
 * write bumps PermissionsVersion, so their cached permissions drop.
 */
@Module({
  imports: [AuthDatabaseModule],
  controllers: [UserGroupsController, MyUserGroupsController],
  providers: [UserGroupsService, PermissionsVersion],
  exports: [UserGroupsService],
})
export class UserGroupsModule {}
