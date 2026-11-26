import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Can, PermissionsService } from '@dafne/backend-permissions';
import { Session } from '@dafne/backend-session';
import type { SessionUser, UserSession } from '@dafne/backend-session';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  activityBodySchema,
  listActivitiesQuerySchema,
  type ActivityBody,
  type ActivityDetail,
  type ActivitiesList,
  type ListActivitiesQuery,
  type ChangesList,
  listChangesQuerySchema,
  type ListChangesQuery,
  msg,
  activityStatusBodySchema,
  type ActivityStatusBody,
} from '@dafne/contracts';
import { ActivitiesService } from './activities.service.js';
import type { CrudController } from '@dafne/backend-crud';
import { ChangelogService } from '@dafne/backend-changelog';
import { ACTIVITIES_RESOURCE } from './activity.changelog.js';

/** Activities, for any signed-in user (the global auth guard checks it). */
@Controller('activities')
export class ActivitiesController
  implements
    CrudController<
      number,
      ListActivitiesQuery,
      ActivitiesList,
      ActivityBody,
      ActivityDetail
    >
{
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly changelog: ChangelogService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listActivitiesQuerySchema))
    query: ListActivitiesQuery,
  ): Promise<ActivitiesList> {
    return this.activitiesService.list(query);
  }

  /** The changes of an activity, newest first. 404 if it doesn't exist or is deleted. */
  @Get(':id/changes')
  async changes(
    @Param('id', IdPipe) id: number,
    @Query(new ZodValidationPipe(listChangesQuerySchema)) query: ListChangesQuery,
  ): Promise<ChangesList> {
    await this.activitiesService.get(id);
    return this.changelog.list(ACTIVITIES_RESOURCE, id, query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<ActivityDetail> {
    return this.activitiesService.get(id);
  }

  @Post()
  @Can('create', 'Activity')
  async create(
    @Body(new ZodValidationPipe(activityBodySchema)) body: ActivityBody,
    @Session() session: UserSession,
  ): Promise<ActivityDetail> {
    // Born open: another status is a status change.
    if (body.status && body.status !== 'open') {
      await this.requireChangeStatus(session.user);
    }
    return this.activitiesService.create(body, session.user);
  }

  @Put(':id')
  @Can('update', 'Activity')
  async update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(activityBodySchema)) body: ActivityBody,
    @Session() session: UserSession,
  ): Promise<ActivityDetail> {
    // The form sends the status too: changing it needs changeStatus.
    if (body.status && body.status !== (await this.activitiesService.get(id)).status) {
      await this.requireChangeStatus(session.user);
    }
    return this.activitiesService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @Can('delete', 'Activity')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.activitiesService.delete(id, session.user);
  }

  /** 403 unless the user may change activities' status (POST :id/status's permission). */
  private async requireChangeStatus(user: SessionUser) {
    if (!(await this.permissions.abilityFor(user)).can('changeStatus', 'Activity')) {
      throw new ForbiddenException(msg('permissions.forbidden'));
    }
  }

  /** Moves the activity to another status (see ACTIVITY_STATES): closes or reopens it. */
  @Post(':id/status')
  @Can('changeStatus', 'Activity')
  @HttpCode(HttpStatus.OK)
  changeActivityStatus(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(activityStatusBodySchema)) body: ActivityStatusBody,
    @Session() session: UserSession,
  ): Promise<ActivityDetail> {
    return this.activitiesService.changeActivityStatus(id, body.status, session.user);
  }
}
