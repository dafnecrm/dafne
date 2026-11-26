import { ChangelogModule } from '@dafne/backend-changelog';
import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { FsmModule } from '@dafne/backend-fsm';
import { PermissionsModule } from '@dafne/backend-permissions';
import type { ActivityDetail, ActivityStatus } from '@dafne/contracts';
import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller.js';
import { ActivitiesService } from './activities.service.js';
import { ACTIVITIES_RESOURCE, ACTIVITY_CHANGELOG, ActivityStatusChangelog } from './activity.changelog.js';
import { ACTIVITY_STATE_MACHINE, ACTIVITY_STATES } from './activity.states.js';
import { ActivityTransition } from './activity.transition.js';

@Module({
  imports: [
    DatabaseModule,
    // @Can() on the controller: AbilityGuard and the permissions.
    PermissionsModule,
    CrudHooksModule,
    // The change log: the CRUD writes, and (below) every status change.
    ChangelogModule,
    ChangelogModule.forFeature<ActivityDetail>(ACTIVITIES_RESOURCE, ACTIVITY_CHANGELOG),
    FsmModule.forFeature<ActivityStatus, number>({
      name: ACTIVITY_STATE_MACHINE,
      transition: ActivityTransition,
      states: ACTIVITY_STATES,
      imports: [ChangelogModule],
      post: [ActivityStatusChangelog],
    }),
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
