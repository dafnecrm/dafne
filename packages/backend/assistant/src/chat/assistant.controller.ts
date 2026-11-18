import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Session, type UserSession } from '@dafne/backend-session';
import { IdPipe, localeFrom, ZodValidationPipe } from '@dafne/backend-common';
import {
  assistantMessageBodySchema,
  createConversationBodySchema,
  updateConversationBodySchema,
  type AssistantAction,
  type AssistantConversation,
  type AssistantConversationDetail,
  type AssistantMessageBody,
  type AssistantStreamEvent,
  type AvailableAssistantAgent,
  type CreateConversationBody,
  type UpdateConversationBody,
} from '@dafne/contracts';
import { ChatService } from './chat.service.js';
import { ConversationsService } from './conversations.service.js';

/**
 * The AI assistant, for every user of the sales app (the global
 * SessionGuard checks it): the agents they can talk to, their own
 * conversations, and the actions the assistant proposed to them.
 */
@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly chat: ChatService,
  ) {}

  /** The agents the user can use (all of them for super-admins). */
  @Get('agents')
  agents(@Session() session: UserSession): Promise<AvailableAssistantAgent[]> {
    return this.conversations.availableAgents(session.user);
  }

  @Get('conversations')
  list(@Session() session: UserSession): Promise<AssistantConversation[]> {
    return this.conversations.list(session.user);
  }

  @Post('conversations')
  create(
    @Body(new ZodValidationPipe(createConversationBodySchema)) body: CreateConversationBody,
    @Session() session: UserSession,
  ): Promise<AssistantConversation> {
    return this.conversations.create(body, session.user);
  }

  @Get('conversations/:id')
  get(@Param('id', IdPipe) id: number, @Session() session: UserSession): Promise<AssistantConversationDetail> {
    return this.conversations.get(id, session.user);
  }

  /** Switches the model, if the agent allows it. */
  @Patch('conversations/:id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(updateConversationBodySchema)) body: UpdateConversationBody,
    @Session() session: UserSession,
  ): Promise<AssistantConversation> {
    return this.conversations.updateModel(id, body, session.user);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', IdPipe) id: number, @Session() session: UserSession): Promise<void> {
    return this.conversations.delete(id, session.user);
  }

  /**
   * Sends a message and streams the answer as server-sent events
   * (AssistantStreamEvent, one JSON per `data:` line). Errors before the
   * stream starts (404, 400, 429…) are plain HTTP errors.
   */
  @Post('conversations/:id/messages')
  async send(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(assistantMessageBodySchema)) body: AssistantMessageBody,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const locale = localeFrom(acceptLanguage);
    await this.chat.checkRate(session.user);
    const run = await this.chat.prepare(id, body.text, session.user, locale);

    response.status(HttpStatus.OK);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    // No buffering in proxies (e.g. nginx), so the text shows as it comes.
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    const abort = new AbortController();
    request.on('close', () => abort.abort());
    const emit = (event: AssistantStreamEvent) => {
      if (!response.writableEnded) {
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };
    try {
      await run(emit, abort.signal);
    } finally {
      response.end();
    }
  }

  /** Runs a proposed action as the user; failed (with the reason) if the CRM refuses it. */
  @Post('actions/:id/confirm')
  confirm(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<AssistantAction> {
    return this.conversations.confirm(id, session.user, localeFrom(acceptLanguage));
  }

  @Post('actions/:id/reject')
  reject(@Param('id', IdPipe) id: number, @Session() session: UserSession): Promise<AssistantAction> {
    return this.conversations.reject(id, session.user);
  }
}
