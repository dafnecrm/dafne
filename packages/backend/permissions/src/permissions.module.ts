import { DatabaseModule } from '@dafne/backend-database';
import { PermissionsVersion } from '@dafne/backend-user-groups/version';
import { Module } from '@nestjs/common';
import { AbilityGuard } from './can.decorator.js';
import { GroupPermissionsController } from './group-permissions.controller.js';
import { GroupPermissionsService } from './group-permissions.service.js';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsService } from './permissions.service.js';

/**
 * What the user groups (shared, apps/auth) can do in this app, and what the
 * signed-in user can (/me/permissions). A lib whose controllers use @Can()
 * imports this module (it provides AbilityGuard). Needs the app's global
 * CacheModule, shared with apps/auth (Redis).
 */
@Module({
  imports: [DatabaseModule],
  controllers: [GroupPermissionsController, PermissionsController],
  providers: [PermissionsService, GroupPermissionsService, PermissionsVersion, AbilityGuard],
  exports: [PermissionsService, AbilityGuard],
})
export class PermissionsModule {}
