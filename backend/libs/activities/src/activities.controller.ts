import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '@app/common';
import {
  activityBodySchema,
  listActivitiesQuerySchema,
  type ActivityBody,
  type ActivityDetail,
  type ActivitiesList,
  type ListActivitiesQuery,
} from '@app/contracts';
import { ActivitiesService } from './activities.service.js';

/** Activities, for any signed-in user (the global auth guard checks it). */
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  listActivities(
    @Query(new ZodValidationPipe(listActivitiesQuerySchema))
    query: ListActivitiesQuery,
  ): Promise<ActivitiesList> {
    return this.activitiesService.listActivities(query);
  }

  @Get(':id')
  getActivity(@Param('id') id: string): Promise<ActivityDetail> {
    return this.activitiesService.getActivity(id);
  }

  @Post()
  createActivity(
    @Body(new ZodValidationPipe(activityBodySchema)) body: ActivityBody,
    @Session() session: UserSession,
  ): Promise<ActivityDetail> {
    return this.activitiesService.createActivity(body, session.user.id);
  }

  @Put(':id')
  updateActivity(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(activityBodySchema)) body: ActivityBody,
    @Session() session: UserSession,
  ): Promise<ActivityDetail> {
    return this.activitiesService.updateActivity(id, body, session.user.id);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteActivity(
    @Param('id') id: string,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.activitiesService.deleteActivity(id, session.user.id);
  }
}
