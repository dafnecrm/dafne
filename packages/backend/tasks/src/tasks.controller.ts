import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import { Roles, Session, type UserSession } from '@dafne/backend-session';
import {
  listTaskRunsQuerySchema,
  updateTaskBodySchema,
  type ListTaskRunsQuery,
  type TaskDetail,
  type TaskRunDetail,
  type TaskRunsList,
  type TasksList,
  type UpdateTaskBody,
} from '@dafne/contracts';
import { Body, Controller, Get, Logger, Param, Post, Put, Query } from '@nestjs/common';
import { TasksService } from './tasks.service.js';

/**
 * The scheduled tasks, for admins (of the app, or global): their settings,
 * their runs with logs and errors, and starting one now. Tasks come from
 * code (`@Task`): there's no create or delete, so not a CrudController.
 */
@Roles(['admin'])
@Controller()
export class TasksController {
  private logger = new Logger(TasksController.name);

  constructor(private readonly tasks: TasksService) {}

  @Get('tasks')
  list(): Promise<TasksList> {
    return this.tasks.list();
  }

  @Get('tasks/:key')
  get(@Param('key') key: string): Promise<TaskDetail> {
    this.logger.log("Getting task with key: " + key)
    return this.tasks.get(key);
  }

  /** Replaces the settings: from then on the code's defaults no longer apply. */
  @Put('tasks/:key')
  update(
    @Param('key') key: string,
    @Body(new ZodValidationPipe(updateTaskBodySchema)) body: UpdateTaskBody,
    @Session() session: UserSession,
  ): Promise<TaskDetail> {
    return this.tasks.update(key, body, session.user);
  }

  /** Back to the code's settings. */
  @Post('tasks/:key/reset')
  reset(@Param('key') key: string, @Session() session: UserSession): Promise<TaskDetail> {
    return this.tasks.reset(key, session.user);
  }

  /** Starts a run now: a 409 when one is queued or running already. */
  @Post('tasks/:key/run')
  start(@Param('key') key: string, @Session() session: UserSession): Promise<TaskRunDetail> {
    return this.tasks.start(key, session.user);
  }

  @Get('tasks/:key/runs')
  runs(
    @Param('key') key: string,
    @Query(new ZodValidationPipe(listTaskRunsQuerySchema)) query: ListTaskRunsQuery,
  ): Promise<TaskRunsList> {
    return this.tasks.runsOf(key, query);
  }

  @Get('task-runs/:id')
  run(@Param('id', IdPipe) id: number): Promise<TaskRunDetail> {
    return this.tasks.run(id);
  }
}
