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
  assistantProviderBodySchema,
  listAssistantProvidersQuerySchema,
  type AssistantProviderBody,
  type AssistantProviderCheck,
  type AssistantProviderDetail,
  type AssistantProvidersList,
  type ListAssistantProvidersQuery,
} from '@dafne/contracts';
import type { CrudController } from '@dafne/backend-crud';
import { AssistantProvidersService } from './assistant-providers.service.js';
import { ProviderCheckService } from './provider-check.service.js';

/** Providers of the AI assistant: super-admins only (`@SuperAdmin()`). */
@SuperAdmin()
@Controller('assistant-providers')
export class AssistantProvidersController implements CrudController<
  number,
  ListAssistantProvidersQuery,
  AssistantProvidersList,
  AssistantProviderBody,
  AssistantProviderDetail
> {
  constructor(
    private readonly assistantProvidersService: AssistantProvidersService,
    private readonly checks: ProviderCheckService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listAssistantProvidersQuerySchema))
    query: ListAssistantProvidersQuery,
  ): Promise<AssistantProvidersList> {
    return this.assistantProvidersService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<AssistantProviderDetail> {
    return this.assistantProvidersService.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(assistantProviderBodySchema))
    body: AssistantProviderBody,
    @Session() session: UserSession,
  ): Promise<AssistantProviderDetail> {
    return this.assistantProvidersService.create(body, session.user);
  }

  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(assistantProviderBodySchema))
    body: AssistantProviderBody,
    @Session() session: UserSession,
  ): Promise<AssistantProviderDetail> {
    return this.assistantProvidersService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.assistantProvidersService.delete(id, session.user);
  }

  /** Tries the provider (its key and URL) and lists its models. */
  @Post(':id/check')
  @HttpCode(HttpStatus.OK)
  async check(@Param('id', IdPipe) id: number): Promise<AssistantProviderCheck> {
    return this.checks.check(await this.assistantProvidersService.get(id));
  }
}
