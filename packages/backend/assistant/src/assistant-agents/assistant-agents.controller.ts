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
  assistantAgentBodySchema,
  listAssistantAgentsQuerySchema,
  type AssistantAgentBody,
  type AssistantAgentDetail,
  type AssistantAgentsList,
  type ListAssistantAgentsQuery,
} from '@dafne/contracts';
import type { CrudController } from '@dafne/backend-crud';
import { AssistantAgentsService } from './assistant-agents.service.js';

/** Agents of the AI assistant: super-admins only (`@SuperAdmin()`). */
@SuperAdmin()
@Controller('assistant-agents')
export class AssistantAgentsController implements CrudController<
  number,
  ListAssistantAgentsQuery,
  AssistantAgentsList,
  AssistantAgentBody,
  AssistantAgentDetail
> {
  constructor(
    private readonly assistantAgentsService: AssistantAgentsService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listAssistantAgentsQuerySchema))
    query: ListAssistantAgentsQuery,
  ): Promise<AssistantAgentsList> {
    return this.assistantAgentsService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<AssistantAgentDetail> {
    return this.assistantAgentsService.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(assistantAgentBodySchema))
    body: AssistantAgentBody,
    @Session() session: UserSession,
  ): Promise<AssistantAgentDetail> {
    return this.assistantAgentsService.create(body, session.user);
  }

  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(assistantAgentBodySchema))
    body: AssistantAgentBody,
    @Session() session: UserSession,
  ): Promise<AssistantAgentDetail> {
    return this.assistantAgentsService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.assistantAgentsService.delete(id, session.user);
  }
}
