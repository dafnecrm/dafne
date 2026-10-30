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
  taskBodySchema,
  listTasksQuerySchema,
  type TaskBody,
  type TaskDetail,
  type TasksList,
  type ListTasksQuery,
} from '@app/contracts';
import { TasksService } from './tasks.service.js';

/** Tasks, for any signed-in user (the global auth guard checks it). */
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  listTasks(
    @Query(new ZodValidationPipe(listTasksQuerySchema))
    query: ListTasksQuery,
  ): Promise<TasksList> {
    return this.tasksService.listTasks(query);
  }

  @Get(':id')
  getTask(@Param('id') id: string): Promise<TaskDetail> {
    return this.tasksService.getTask(id);
  }

  @Post()
  createTask(
    @Body(new ZodValidationPipe(taskBodySchema)) body: TaskBody,
    @Session() session: UserSession,
  ): Promise<TaskDetail> {
    return this.tasksService.createTask(body, session.user.id);
  }

  @Put(':id')
  updateTask(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(taskBodySchema)) body: TaskBody,
    @Session() session: UserSession,
  ): Promise<TaskDetail> {
    return this.tasksService.updateTask(id, body, session.user.id);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(
    @Param('id') id: string,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.tasksService.deleteTask(id, session.user.id);
  }
}
