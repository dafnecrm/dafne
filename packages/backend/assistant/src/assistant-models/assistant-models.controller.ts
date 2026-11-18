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
import { Session, SuperAdmin } from '@dafne/backend-session';
import type { UserSession } from '@dafne/backend-session';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  assistantModelBodySchema,
  listAssistantModelsQuerySchema,
  type AssistantModelBody,
  type AssistantModelDetail,
  type AssistantModelsList,
  type ListAssistantModelsQuery,
} from '@dafne/contracts';
import type { CrudController } from '@dafne/backend-crud';
import { AssistantModelsService } from './assistant-models.service.js';

/** Models of the AI assistant: super-admins only (`@SuperAdmin()`). */
@SuperAdmin()
@Controller('assistant-models')
export class AssistantModelsController implements CrudController<
  number,
  ListAssistantModelsQuery,
  AssistantModelsList,
  AssistantModelBody,
  AssistantModelDetail
> {
  constructor(
    private readonly assistantModelsService: AssistantModelsService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listAssistantModelsQuerySchema))
    query: ListAssistantModelsQuery,
  ): Promise<AssistantModelsList> {
    return this.assistantModelsService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<AssistantModelDetail> {
    return this.assistantModelsService.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(assistantModelBodySchema))
    body: AssistantModelBody,
    @Session() session: UserSession,
  ): Promise<AssistantModelDetail> {
    return this.assistantModelsService.create(body, session.user);
  }

  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(assistantModelBodySchema))
    body: AssistantModelBody,
    @Session() session: UserSession,
  ): Promise<AssistantModelDetail> {
    return this.assistantModelsService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.assistantModelsService.delete(id, session.user);
  }
}
