import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Session } from '@dafne/backend-session';
import type { UserSession } from '@dafne/backend-session';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  activityBodySchema,
  listActivitiesQuerySchema,
  type ActivityBody,
  type ActivityDetail,
  type ActivitiesList,
  type ListActivitiesQuery,
} from '@dafne/contracts';
import { ActivitiesService } from './activities.service.js';
import type { CrudController } from '@dafne/backend-crud';

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
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listActivitiesQuerySchema))
    query: ListActivitiesQuery,
  ): Promise<ActivitiesList> {
    return this.activitiesService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<ActivityDetail> {
    return this.activitiesService.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(activityBodySchema)) body: ActivityBody,
    @Session() session: UserSession,
  ): Promise<ActivityDetail> {
    return this.activitiesService.create(body, session.user);
  }

  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(activityBodySchema)) body: ActivityBody,
    @Session() session: UserSession,
  ): Promise<ActivityDetail> {
    return this.activitiesService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.activitiesService.delete(id, session.user);
  }

  @Patch(':id/close')
  async completeActivity(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ) {
    return this.activitiesService.closeActivity(id, session.user.id);
  }

  @Patch(':id/reopen')
  async reopenActivity(@Param('id', IdPipe) id: number) {
    return this.activitiesService.reopenActivity(id);
  }
}
