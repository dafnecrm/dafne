import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { UserGroupsModule } from '@dafne/backend-user-groups';
import { ActivitiesService } from './activities.service.js';
import { ActivitiesController } from './activities.controller.js';

@Module({
  // UserGroupsModule: AbilityGuard for @Can() on the controller.
  imports: [DatabaseModule, CrudHooksModule, UserGroupsModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
