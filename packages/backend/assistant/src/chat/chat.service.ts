import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isStepCount, streamText, type ModelMessage } from 'ai';
import type { Actor } from '@dafne/backend-crud';
import { translate } from '@dafne/backend-common';
import {
  ASSISTANT_TOOL_NAMES,
  ASSISTANT_WRITE_TOOLS,
  msg,
  type AssistantStreamEvent,
  type AssistantToolName,
  type ContractLocale,
} from '@dafne/contracts';
import { PermissionsService } from '@dafne/backend-user-groups';
import { AssistantTools, errorText } from '../tools/assistant-tools.js';
import { ConversationsService } from './conversations.service.js';
import { ModelFactory } from './model-factory.js';
import { systemPrompt, userTurn } from './system-prompt.js';

/** At most this many model calls per message (tool calls and answer). */
const MAX_STEPS = 8;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/** Added to the instructions when the model ended without answering. */
const FINAL_ANSWER =
  'You ended your turn without answering. Answer the user now, in words: what you found, what you proposed, or, if you have no tool for the request, say so plainly and what they can do instead.';

const isWriteTool = (name: string) => (ASSISTANT_WRITE_TOOLS as readonly string[]).includes(name);

const isToolName = (name: string): name is AssistantToolName =>
  (ASSISTANT_TOOL_NAMES as readonly string[]).includes(name);

/**
 * One turn of a conversation: the user's message, then the model's answer
 * with as many tool calls as it needs (up to MAX_STEPS), streamed as
 * events. Everything is saved, in the provider-neutral format, so the
 * conversation can go on with another model.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly conversations: ConversationsService,
    private readonly tools: AssistantTools,
    private readonly models: ModelFactory,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly permissions: PermissionsService,
  ) {}

  /** Throws 429 past ASSISTANT_RATE_LIMIT messages (default 30) in 10 minutes. */
  async checkRate(actor: Actor): Promise<void> {
    const max = Number(this.config.get<string>('ASSISTANT_RATE_LIMIT') ?? 30);
    const key = `assistant:rate:${actor.id}`;
    const count = ((await this.cache.get<number>(key)) ?? 0) + 1;
    if (count > max) {
      throw new HttpException(msg('assistant.rateLimited'), HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.cache.set(key, count, RATE_WINDOW_MS);
  }

  /**
   * Runs a turn and calls `emit` for each event, ending with `done` or
   * `error`. Setup errors (no conversation, no model…) are thrown before
   * anything is streamed, so the controller answers them as plain HTTP.
   */
  async prepare(conversationId: number, text: string, actor: Actor, locale: ContractLocale) {
    const conversation = await this.conversations.owned(conversationId, actor);
    const agent = await this.conversations.agent(conversation.agentId, actor);
    const model = await this.conversations.model(agent, conversation.modelId);
    const languageModel = this.models.create(model.provider, model.modelId);
    const ability = await this.permissions.abilityFor(actor);

    return async (emit: (event: AssistantStreamEvent) => void, abortSignal: AbortSignal) => {
      const history = await this.conversations.history(conversation.id);
      const userMessage: ModelMessage = { role: 'user', content: userTurn(text, new Date()) };
      await this.conversations.append(
        conversation.id,
        [{ message: userMessage }],
        conversation.title ? undefined : text.slice(0, 80),
      );
      const tools = this.tools.build(agent.tools, {
        conversationId: conversation.id,
        locale,
        ability,
        propose: async (kind, toolCallId, payload) => {
          const action = await this.conversations.propose(conversation.id, kind, toolCallId, payload);
          emit({ type: 'action', action });
          return action;
        },
      });

      // The agent's write tools the user may not use were left out above.
      const allowed = Object.keys(tools).filter(isWriteTool);
      const denied = agent.tools.filter((name) => isWriteTool(name) && !allowed.includes(name));
      const instructions = systemPrompt(agent.systemPrompt, locale, { allowed, denied });

      try {
        /** One model run: streams its text and tool calls, returns what it said. */
        const step = async (messages: ModelMessage[], final: boolean) => {
          const result = streamText({
            model: languageModel,
            instructions: final ? `${instructions}\n\n${FINAL_ANSWER}` : instructions,
            messages,
            tools,
            // The last chance has to answer in words.
            toolChoice: final ? 'none' : 'auto',
            stopWhen: isStepCount(final ? 1 : MAX_STEPS),
            reasoning: model.options?.reasoning,
            temperature: model.options?.temperature,
            maxOutputTokens: model.options?.maxOutputTokens,
            abortSignal,
          });
          let text = '';
          let failed = false;
          for await (const part of result.stream) {
            if (part.type === 'text-delta') {
              text += part.text;
              emit({ type: 'text', delta: part.text });
            } else if (part.type === 'tool-call' && isToolName(part.toolName)) {
              emit({ type: 'tool', name: part.toolName });
            } else if (part.type === 'error') {
              failed = true;
              this.logger.warn(`Conversation ${conversation.id}: ${String(part.error)}`);
            }
          }
          return { text, failed, messages: await result.responseMessages };
        };

        const turn = [...history, userMessage];
        const first = await step(turn, false);
        let failed = first.failed;
        let said = first.text.trim().length > 0;
        const produced = [...first.messages];
        // Small models sometimes stop after their tools without a word (e.g.
        // asked for something no tool does): ask once more, tools off.
        if (!failed && !said) {
          this.logger.warn(`Conversation ${conversation.id}: no answer, asking for one`);
          const last = await step([...turn, ...produced], true);
          failed = last.failed;
          said = last.text.trim().length > 0;
          produced.push(...last.messages);
        }
        const lastId = await this.conversations.append(
          conversation.id,
          produced.map((message) => ({ message, modelId: model.id })),
        );
        if (failed) {
          emit({ type: 'error', message: translate(msg('assistant.failed'), locale) });
        } else if (!said) {
          emit({ type: 'error', message: translate(msg('assistant.noAnswer'), locale) });
        } else {
          emit({ type: 'done', messageId: lastId });
        }
      } catch (error) {
        if (abortSignal.aborted) {
          return;
        }
        this.logger.error(`Conversation ${conversation.id} failed`, error);
        const message =
          error instanceof HttpException ? errorText(error, locale) : translate(msg('assistant.provider.unavailable'), locale);
        emit({ type: 'error', message });
      }
    };
  }
}
