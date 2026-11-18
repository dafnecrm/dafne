import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { ModelMessage } from 'ai';
import type { Actor } from '@dafne/backend-crud';
import {
  isSuperAdmin,
  msg,
  type AssistantAction,
  type AssistantChatMessage,
  type AssistantConversation,
  type AssistantConversationDetail,
  type AssistantToolName,
  type AvailableAssistantAgent,
  type AvailableAssistantModel,
  type ContractLocale,
  type CreateConversationBody,
  type UpdateConversationBody,
  type AssistantModelOptions,
  type AssistantProviderKind,
} from '@dafne/contracts';
import { PermissionsService } from '@dafne/backend-user-groups';
import { AssistantTools, errorText } from '../tools/assistant-tools.js';
import { WRITE_TOOLS, type WriteToolName } from '../tools/write-tools.js';
import type { ProviderConfig } from './model-factory.js';

const {
  assistantAgent,
  assistantAgentGroup,
  assistantModel,
  assistantProvider,
  assistantConversation,
  assistantMessage,
  assistantAction,
  userGroup,
  userGroupMember,
} = schema;

/** An enabled model with its enabled provider: what a conversation runs on. */
export interface ResolvedModel extends AvailableAssistantModel {
  provider: ProviderConfig;
  options: AssistantModelOptions | null;
}

/** An agent as a conversation needs it. */
export interface ResolvedAgent {
  id: number;
  name: string;
  systemPrompt: string;
  tools: AssistantToolName[];
  defaultModelId: number | null;
  allowModelOverride: boolean;
  audience: 'everyone' | 'groups';
}

/** A stored message to save (the model's or an app note). */
export interface NewMessage {
  message: ModelMessage;
  modelId?: number | null;
  note?: boolean;
}

/**
 * Conversations with the AI assistant, each owned by one user: only they
 * read it, write to it and decide its actions. Agents and models come from
 * the super-admins' settings; only enabled ones (and models of enabled
 * providers that can call tools) are offered.
 */
@Injectable()
export class ConversationsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly tools: AssistantTools,
    private readonly permissions: PermissionsService,
  ) {}

  /* ---------- Agents and models ---------- */

  /** The models a user can pick: enabled, with tools, of an enabled provider. */
  async availableModels(): Promise<ResolvedModel[]> {
    const rows = await this.db
      .select({
        id: assistantModel.id,
        label: assistantModel.label,
        modelId: assistantModel.modelId,
        options: assistantModel.options,
        providerName: assistantProvider.name,
        kind: assistantProvider.kind,
        baseUrl: assistantProvider.baseUrl,
        apiKeyEnv: assistantProvider.apiKeyEnv,
      })
      .from(assistantModel)
      .innerJoin(assistantProvider, eq(assistantProvider.id, assistantModel.providerId))
      .where(
        and(
          isNull(assistantModel.deletedAt),
          isNull(assistantProvider.deletedAt),
          eq(assistantModel.enabled, true),
          eq(assistantModel.supportsTools, true),
          eq(assistantProvider.enabled, true),
        ),
      )
      .orderBy(asc(assistantModel.label));
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      modelId: row.modelId,
      providerKind: row.kind as AssistantProviderKind,
      providerName: row.providerName,
      local: row.kind === 'openai-compatible',
      options: (row.options as AssistantModelOptions | null) ?? null,
      provider: {
        name: row.providerName,
        kind: row.kind as AssistantProviderKind,
        baseUrl: row.baseUrl,
        apiKeyEnv: row.apiKeyEnv,
      },
    }));
  }

  /** The enabled agents `actor` can use, each with the models it can use. */
  async availableAgents(actor: Actor): Promise<AvailableAssistantAgent[]> {
    const [agents, models, groupAgents] = await Promise.all([
      this.enabledAgents(),
      this.availableModels(),
      this.groupAgentsOf(actor),
    ]);
    return agents.filter((agent) => canUse(agent, actor, groupAgents)).map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      defaultModelId: agent.defaultModelId,
      allowModelOverride: agent.allowModelOverride,
      models: this.modelsOf(agent, models).map(({ provider: _p, options: _o, ...model }) => model),
    }));
  }

  private modelsOf(agent: Pick<ResolvedAgent, 'defaultModelId' | 'allowModelOverride'>, models: ResolvedModel[]) {
    return agent.allowModelOverride ? models : models.filter((model) => model.id === agent.defaultModelId);
  }

  private enabledAgents() {
    return this.db
      .select({
        id: assistantAgent.id,
        name: assistantAgent.name,
        description: assistantAgent.description,
        systemPrompt: assistantAgent.systemPrompt,
        tools: assistantAgent.tools,
        defaultModelId: assistantAgent.defaultModelId,
        allowModelOverride: assistantAgent.allowModelOverride,
        audience: assistantAgent.audience,
      })
      .from(assistantAgent)
      .where(and(isNull(assistantAgent.deletedAt), eq(assistantAgent.enabled, true)))
      .orderBy(asc(assistantAgent.name));
  }

  /**
   * An enabled agent `actor` can use: 400 if it isn't enabled (deleted,
   * disabled, unknown), 403 if it isn't open to them (e.g. they left its
   * group: their old conversations stay readable, but not writable).
   */
  async agent(id: number, actor: Actor): Promise<ResolvedAgent> {
    const agent = (await this.enabledAgents()).find((a) => a.id === id);
    if (!agent) {
      throw new BadRequestException(msg('assistant.agent.unavailable'));
    }
    if (!canUse(agent, actor, await this.groupAgentsOf(actor))) {
      throw new ForbiddenException(msg('assistant.agent.unavailable'));
    }
    return { ...agent, tools: (agent.tools ?? []) as AssistantToolName[] };
  }

  /** The agents open to a group `actor` is in (deleted groups don't count). */
  private async groupAgentsOf(actor: Actor): Promise<Set<number>> {
    if (isSuperAdmin(actor.role)) {
      return new Set();
    }
    const rows = await this.db
      .selectDistinct({ agentId: assistantAgentGroup.agentId })
      .from(assistantAgentGroup)
      .innerJoin(userGroupMember, eq(userGroupMember.groupId, assistantAgentGroup.groupId))
      .innerJoin(userGroup, eq(userGroup.id, assistantAgentGroup.groupId))
      .where(and(eq(userGroupMember.userId, actor.id), isNull(userGroup.deletedAt)));
    return new Set(rows.map((row) => row.agentId));
  }

  /**
   * The model a conversation runs on: its own, or the agent's default.
   * 400 if none is available or the agent doesn't allow it.
   */
  async model(agent: ResolvedAgent, modelId: number | null | undefined): Promise<ResolvedModel> {
    const wanted = modelId ?? agent.defaultModelId;
    if (wanted === null || wanted === undefined) {
      throw new BadRequestException(msg('assistant.model.none'));
    }
    if (!agent.allowModelOverride && wanted !== agent.defaultModelId) {
      throw new BadRequestException(msg('assistant.model.notAllowed'));
    }
    const model = (await this.availableModels()).find((m) => m.id === wanted);
    if (!model) {
      throw new BadRequestException(msg('assistant.model.unavailable'));
    }
    return model;
  }

  /* ---------- Conversations ---------- */

  async list(actor: Actor): Promise<AssistantConversation[]> {
    return this.db
      .select({
        id: assistantConversation.id,
        title: assistantConversation.title,
        agentId: assistantConversation.agentId,
        modelId: assistantConversation.modelId,
        createdAt: assistantConversation.createdAt,
        updatedAt: assistantConversation.updatedAt,
      })
      .from(assistantConversation)
      .where(eq(assistantConversation.userId, actor.id))
      .orderBy(desc(assistantConversation.updatedAt))
      .limit(50);
  }

  async create(body: CreateConversationBody, actor: Actor): Promise<AssistantConversation> {
    const agent = await this.agent(body.agentId, actor);
    const model = await this.model(agent, body.modelId);
    const [created] = await this.db
      .insert(assistantConversation)
      .values({ userId: actor.id, agentId: agent.id, modelId: model.id })
      .returning();
    return this.summary(created);
  }

  /** The actor's conversation; 404 for anyone else's. */
  async owned(id: number, actor: Actor) {
    const [found] = await this.db
      .select()
      .from(assistantConversation)
      .where(and(eq(assistantConversation.id, id), eq(assistantConversation.userId, actor.id)));
    if (!found) {
      throw new NotFoundException(msg('assistant.conversation.notFound'));
    }
    return found;
  }

  async get(id: number, actor: Actor): Promise<AssistantConversationDetail> {
    const conversation = await this.owned(id, actor);
    const [rows, actions] = await Promise.all([this.rows(id), this.actions(id)]);
    return { ...this.summary(conversation), messages: chatMessages(rows), actions };
  }

  async updateModel(id: number, body: UpdateConversationBody, actor: Actor): Promise<AssistantConversation> {
    const conversation = await this.owned(id, actor);
    const model = await this.model(await this.agent(conversation.agentId, actor), body.modelId);
    const [updated] = await this.db
      .update(assistantConversation)
      .set({ modelId: model.id })
      .where(eq(assistantConversation.id, id))
      .returning();
    return this.summary(updated);
  }

  async delete(id: number, actor: Actor): Promise<void> {
    await this.owned(id, actor);
    await this.db.delete(assistantConversation).where(eq(assistantConversation.id, id));
  }

  /** The conversation as the model reads it, oldest first. */
  async history(id: number): Promise<ModelMessage[]> {
    return (await this.rows(id)).map((row) => row.content as ModelMessage);
  }

  /** Appends messages (never edits them) and touches the conversation. */
  async append(id: number, messages: NewMessage[], title?: string): Promise<number | null> {
    if (!messages.length) {
      return null;
    }
    const saved = await this.db
      .insert(assistantMessage)
      .values(
        messages.map(({ message, modelId, note }) => ({
          conversationId: id,
          role: message.role as 'user' | 'assistant' | 'tool',
          content: message,
          modelId: modelId ?? null,
          note: note ?? false,
        })),
      )
      .returning({ id: assistantMessage.id });
    await this.db
      .update(assistantConversation)
      .set({ updatedAt: new Date(), ...(title ? { title } : {}) })
      .where(eq(assistantConversation.id, id));
    return saved.at(-1)?.id ?? null;
  }

  private rows(conversationId: number) {
    return this.db
      .select()
      .from(assistantMessage)
      .where(eq(assistantMessage.conversationId, conversationId))
      .orderBy(asc(assistantMessage.id));
  }

  private summary(row: typeof assistantConversation.$inferSelect): AssistantConversation {
    return {
      id: row.id,
      title: row.title,
      agentId: row.agentId,
      modelId: row.modelId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /* ---------- Actions ---------- */

  async propose(
    conversationId: number,
    kind: AssistantToolName,
    toolCallId: string,
    payload: Record<string, unknown>,
  ): Promise<AssistantAction> {
    const [created] = await this.db
      .insert(assistantAction)
      .values({ conversationId, kind, toolCallId, payload })
      .returning();
    return action(created);
  }

  private async actions(conversationId: number): Promise<AssistantAction[]> {
    const rows = await this.db
      .select()
      .from(assistantAction)
      .where(eq(assistantAction.conversationId, conversationId))
      .orderBy(asc(assistantAction.id));
    return rows.map(action);
  }

  /** A pending action of the actor's; 404 if not theirs, 409 if decided. */
  private async pending(id: number, actor: Actor) {
    const [found] = await this.db
      .select({ action: assistantAction })
      .from(assistantAction)
      .innerJoin(assistantConversation, eq(assistantConversation.id, assistantAction.conversationId))
      .where(and(eq(assistantAction.id, id), eq(assistantConversation.userId, actor.id)));
    if (!found) {
      throw new NotFoundException(msg('assistant.action.notFound'));
    }
    if (found.action.status !== 'pending') {
      throw new ConflictException(msg('assistant.action.notPending'));
    }
    return found.action;
  }

  /**
   * Runs a pending action as `actor`, through the CRM's services (so with
   * their hooks, change log and guards). A refusal of the CRM (400, 403,
   * 404, 409) marks it failed with the reason; either way the model gets a
   * note, so it knows what happened.
   */
  async confirm(id: number, actor: Actor, locale: ContractLocale): Promise<AssistantAction> {
    const pending = await this.pending(id, actor);
    // Only while the agent is still open to the user.
    await this.agent((await this.owned(pending.conversationId, actor)).agentId, actor);
    const tool = WRITE_TOOLS[pending.kind as WriteToolName];
    let status: 'confirmed' | 'failed' = 'confirmed';
    let result: AssistantAction['result'];
    try {
      // The same permission the API's route asks for (@Can): the services
      // the tools call don't check it.
      const ability = await this.permissions.abilityFor(actor);
      if (!ability.can(tool.needs.action, tool.needs.subject)) {
        throw new ForbiddenException(msg('permissions.forbidden'));
      }
      result = await tool.run(pending.payload, this.tools.services, actor);
    } catch (error) {
      if (!(error instanceof HttpException)) {
        throw error;
      }
      status = 'failed';
      result = { error: errorText(error, locale) };
    }
    const decided = await this.decide(pending.id, status, result);
    await this.note(
      pending.conversationId,
      status === 'confirmed'
        ? `The user confirmed action ${pending.id} (${pending.kind}): done, ${result?.resource} id ${result?.id}.`
        : `The user confirmed action ${pending.id} (${pending.kind}), but it failed: ${result?.error}`,
    );
    return decided;
  }

  async reject(id: number, actor: Actor): Promise<AssistantAction> {
    const pending = await this.pending(id, actor);
    const decided = await this.decide(pending.id, 'rejected', null);
    await this.note(pending.conversationId, `The user rejected action ${pending.id} (${pending.kind}): nothing was written.`);
    return decided;
  }

  private async decide(id: number, status: AssistantAction['status'], result: AssistantAction['result']) {
    const [updated] = await this.db
      .update(assistantAction)
      .set({ status, result, decidedAt: new Date() })
      .where(eq(assistantAction.id, id))
      .returning();
    return action(updated);
  }

  private async note(conversationId: number, text: string) {
    await this.append(conversationId, [
      { message: { role: 'user', content: [{ type: 'text', text: `[App note] ${text}` }] }, note: true },
    ]);
  }
}

function action(row: typeof assistantAction.$inferSelect): AssistantAction {
  return {
    id: row.id,
    conversationId: row.conversationId,
    kind: row.kind as AssistantToolName,
    payload: row.payload,
    status: row.status,
    result: row.result ?? null,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
  };
}

/** Text of a message's content (a string, or its text parts). */
function textOf(content: ModelMessage['content']): string {
  if (typeof content === 'string') {
    return content;
  }
  return content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('');
}

/**
 * The stored messages as the chat shows them: the user's own, and one
 * answer per turn (its steps' text joined, with the tools it used). Tool
 * results and app notes aren't shown.
 */
export function chatMessages(rows: (typeof assistantMessage.$inferSelect)[]): AssistantChatMessage[] {
  const chat: AssistantChatMessage[] = [];
  for (const row of rows) {
    const message = row.content as ModelMessage;
    if (row.note || message.role === 'tool' || message.role === 'system') {
      continue;
    }
    if (message.role === 'user') {
      const text = textOf(message.content).replace(/^\[Today is [^\]]*\]\n/, '');
      chat.push({ id: row.id, role: 'user', text, tools: [], createdAt: row.createdAt });
      continue;
    }
    const tools =
      typeof message.content === 'string'
        ? []
        : message.content.flatMap((part) => (part.type === 'tool-call' ? [part.toolName as AssistantToolName] : []));
    const last = chat.at(-1);
    if (last?.role === 'assistant') {
      const text = textOf(message.content);
      last.id = row.id;
      last.text = last.text && text ? `${last.text}\n\n${text}` : last.text + text;
      last.tools.push(...tools);
      continue;
    }
    chat.push({ id: row.id, role: 'assistant', text: textOf(message.content), tools, createdAt: row.createdAt });
  }
  return chat;
}

/**
 * Whether `actor` may use `agent`: super-admins always (to set agents up),
 * anyone for audience "everyone", members of its groups for "groups"
 * (`groupAgents`: the agents open to the actor's groups).
 */
export function canUse(
  agent: Pick<ResolvedAgent, 'id' | 'audience'>,
  actor: Actor,
  groupAgents: ReadonlySet<number>,
): boolean {
  return isSuperAdmin(actor.role) || agent.audience === 'everyone' || groupAgents.has(agent.id);
}
