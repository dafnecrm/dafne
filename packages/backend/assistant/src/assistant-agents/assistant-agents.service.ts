import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Injectable, NotFoundException } from '@nestjs/common';

import {
  and,
  asc,
  desc,
  eq,
  isNull,
  ilike,
  inArray,
  type Column,
  type SQL,
} from 'drizzle-orm';
import {
  ASSISTANT_AGENT_FILTER_FIELDS,
  type AssistantAgentFilterField,
  type AssistantAgentBody,
  type AssistantAgentDetail,
  type ListedAssistantAgent,
  type AssistantAgentsList,
  type ListAssistantAgentsQuery,
  msg,
} from '@dafne/contracts';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
} from '@dafne/backend-crud';

export const ASSISTANT_AGENTS_DEFAULT_PAGE_SIZE = 20;

const { assistantAgent, assistantAgentGroup, userGroup } = schema;

/** An agent's groups (only for audience "groups"; deleted groups left out). */
async function groupsOf(db: Executor, agentIds: number[]) {
  const byAgent = new Map<number, { id: number; name: string }[]>();
  if (!agentIds.length) {
    return byAgent;
  }
  const rows = await db
    .select({ agentId: assistantAgentGroup.agentId, id: userGroup.id, name: userGroup.name })
    .from(assistantAgentGroup)
    .innerJoin(userGroup, eq(userGroup.id, assistantAgentGroup.groupId))
    .where(and(inArray(assistantAgentGroup.agentId, agentIds), isNull(userGroup.deletedAt)))
    .orderBy(asc(userGroup.name));
  for (const { agentId, ...group } of rows) {
    byAgent.set(agentId, [...(byAgent.get(agentId) ?? []), group]);
  }
  return byAgent;
}

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<
  Record<AssistantAgentFilterField, (value: string) => number | string>
> = {
  id: Number,
  defaultModelId: Number,
};

/** Assistant agents that haven't been deleted. */
const notDeleted = isNull(assistantAgent.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class AssistantAgentsService implements CrudService<
  number,
  ListAssistantAgentsQuery,
  AssistantAgentsList,
  AssistantAgentBody,
  AssistantAgentDetail
> {
  /** Runs the writes with the hooks registered on `assistant-agents`. */
  private readonly hooks: CrudHooks<
    number,
    AssistantAgentBody,
    AssistantAgentDetail
  >;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
  ) {
    this.hooks = registry.for('assistant-agents', {
      db,
      load: (id, tx) => this.get(id, tx),
    });
  }

  /**
   * Lists assistant agents that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(
    query: ListAssistantAgentsQuery = {},
  ): Promise<AssistantAgentsList> {
    const {
      limit = ASSISTANT_AGENTS_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'desc',
    } = query;
    const { db } = this;
    const filters = ASSISTANT_AGENT_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [
        exact
          ? eq(assistantAgent[field] as Column, exact(value))
          : ilike(assistantAgent[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [assistantAgents, total] = await Promise.all([
      db
        .select({
          id: assistantAgent.id,
          name: assistantAgent.name,
          description: assistantAgent.description,
          systemPrompt: assistantAgent.systemPrompt,
          tools: assistantAgent.tools,
          defaultModelId: assistantAgent.defaultModelId,
          allowModelOverride: assistantAgent.allowModelOverride,
          enabled: assistantAgent.enabled,
          audience: assistantAgent.audience,
          createdAt: assistantAgent.createdAt,
          updatedAt: assistantAgent.updatedAt,
        })
        .from(assistantAgent)
        .where(where)
        .orderBy(direction(assistantAgent[sortBy]), asc(assistantAgent.id))
        .limit(limit)
        .offset(offset),
      db.$count(assistantAgent, where),
    ]);

    const groups = await groupsOf(db, assistantAgents.map((agent) => agent.id));
    const items = assistantAgents.map((agent) => ({ ...agent, groups: groups.get(agent.id) ?? [] }));
    // The column holds names the contract validated (assistantToolsSchema).
    return { items: items as ListedAssistantAgent[], total, limit, offset };
  }

  /**
   * One assistant agent that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async get(id: number, db: Executor = this.db): Promise<AssistantAgentDetail> {
    const found = await db.query.assistantAgent.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) {
      throw new NotFoundException(msg('assistantAgents.notFound'));
    }
    const groups = (await groupsOf(db, [id])).get(id) ?? [];
    return { ...found, groups } as AssistantAgentDetail;
  }

  /**
   * Replaces the groups an agent is open to: `groupIds` with audience
   * "groups", none otherwise. A missing group breaks the foreign key: 400.
   */
  private async replaceGroups(tx: Executor, agentId: number, body: AssistantAgentBody) {
    await tx.delete(assistantAgentGroup).where(eq(assistantAgentGroup.agentId, agentId));
    if (body.audience === 'groups' && body.groupIds.length) {
      await tx.insert(assistantAgentGroup).values(body.groupIds.map((groupId) => ({ agentId, groupId })));
    }
  }

  /**
   * Creates an assistant agent; `actor` is the creator. Runs the hooks registered on
   * `assistant-agents` (CrudHooksModule.forFeature), in one transaction.
   */
  async create(
    body: AssistantAgentBody,
    actor: Actor,
  ): Promise<AssistantAgentDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    return this.hooks.create({ body, actor }, async ({ tx, body }) => {
      // The id is serial: the database picks it.
      const [{ id }] = await tx
        .insert(assistantAgent)
        .values({
          name: body.name,
          description: body.description,
          systemPrompt: body.systemPrompt,
          tools: body.tools,
          defaultModelId: body.defaultModelId,
          allowModelOverride: body.allowModelOverride,
          enabled: body.enabled,
          audience: body.audience ?? 'everyone',
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: assistantAgent.id });
      await this.replaceGroups(tx, id, body);
      return id;
    });
  }

  /**
   * Replaces an assistant agent's fields; `actor` is the editor. Throws 404
   * if the assistant agent doesn't exist or is deleted.
   */
  async update(
    id: number,
    body: AssistantAgentBody,
    actor: Actor,
  ): Promise<AssistantAgentDetail> {
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      const result = await tx
        .update(assistantAgent)
        .set({
          name: body.name,
          description: body.description,
          systemPrompt: body.systemPrompt,
          tools: body.tools,
          defaultModelId: body.defaultModelId,
          allowModelOverride: body.allowModelOverride,
          enabled: body.enabled,
          audience: body.audience ?? 'everyone',
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(assistantAgent.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('assistantAgents.notFound'));
      }
      await this.replaceGroups(tx, id, body);
    });
  }

  /**
   * Deletes an assistant agent logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(assistantAgent)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(assistantAgent.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('assistantAgents.notFound'));
      }
    });
  }
}
