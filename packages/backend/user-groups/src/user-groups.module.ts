import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { AbilityGuard } from './can.decorator.js';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsService } from './permissions.service.js';
import { UserGroupsController } from './user-groups.controller.js';
import { UserGroupsService } from './user-groups.service.js';

/**
 * User groups and their permissions. A lib whose controllers use @Can()
 * imports this module (it provides AbilityGuard). Needs the app's global
 * CacheModule.
 */
@Module({
  imports: [DatabaseModule, CrudHooksModule],
  controllers: [UserGroupsController, PermissionsController],
  providers: [UserGroupsService, PermissionsService, AbilityGuard],
  exports: [UserGroupsService, PermissionsService, AbilityGuard],
})
export class UserGroupsModule {}
