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
  type Column,
  type SQL,
} from 'drizzle-orm';
import {
  ASSISTANT_PROVIDER_FILTER_FIELDS,
  type AssistantProviderFilterField,
  type AssistantProviderBody,
  type AssistantProviderDetail,
  type AssistantProvidersList,
  type ListAssistantProvidersQuery,
  msg,
} from '@dafne/contracts';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
} from '@dafne/backend-crud';

export const ASSISTANT_PROVIDERS_DEFAULT_PAGE_SIZE = 20;

const { assistantProvider } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<
  Record<AssistantProviderFilterField, (value: string) => number | string>
> = {
  id: Number,
};

/** Assistant providers that haven't been deleted. */
const notDeleted = isNull(assistantProvider.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class AssistantProvidersService implements CrudService<
  number,
  ListAssistantProvidersQuery,
  AssistantProvidersList,
  AssistantProviderBody,
  AssistantProviderDetail
> {
  /** Runs the writes with the hooks registered on `assistant-providers`. */
  private readonly hooks: CrudHooks<
    number,
    AssistantProviderBody,
    AssistantProviderDetail
  >;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
  ) {
    this.hooks = registry.for('assistant-providers', {
      db,
      load: (id, tx) => this.get(id, tx),
    });
  }

  /**
   * Lists assistant providers that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(
    query: ListAssistantProvidersQuery = {},
  ): Promise<AssistantProvidersList> {
    const {
      limit = ASSISTANT_PROVIDERS_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'desc',
    } = query;
    const { db } = this;
    const filters = ASSISTANT_PROVIDER_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [
        exact
          ? eq(assistantProvider[field] as Column, exact(value))
          : ilike(assistantProvider[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [assistantProviders, total] = await Promise.all([
      db
        .select({
          id: assistantProvider.id,
          name: assistantProvider.name,
          kind: assistantProvider.kind,
          baseUrl: assistantProvider.baseUrl,
          apiKeyEnv: assistantProvider.apiKeyEnv,
          enabled: assistantProvider.enabled,
          createdAt: assistantProvider.createdAt,
          updatedAt: assistantProvider.updatedAt,
        })
        .from(assistantProvider)
        .where(where)
        .orderBy(
          direction(assistantProvider[sortBy]),
          asc(assistantProvider.id),
        )
        .limit(limit)
        .offset(offset),
      db.$count(assistantProvider, where),
    ]);

    return { items: assistantProviders, total, limit, offset };
  }

  /**
   * One assistant provider that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async get(
    id: number,
    db: Executor = this.db,
  ): Promise<AssistantProviderDetail> {
    const found = await db.query.assistantProvider.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) {
      throw new NotFoundException(msg('assistantProviders.notFound'));
    }
    return found;
  }

  /**
   * Creates an assistant provider; `actor` is the creator. Runs the hooks registered on
   * `assistant-providers` (CrudHooksModule.forFeature), in one transaction.
   */
  async create(
    body: AssistantProviderBody,
    actor: Actor,
  ): Promise<AssistantProviderDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    return this.hooks.create({ body, actor }, async ({ tx, body }) => {
      // The id is serial: the database picks it.
      const [{ id }] = await tx
        .insert(assistantProvider)
        .values({
          name: body.name,
          kind: body.kind,
          baseUrl: body.baseUrl,
          apiKeyEnv: body.apiKeyEnv,
          enabled: body.enabled,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: assistantProvider.id });
      return id;
    });
  }

  /**
   * Replaces an assistant provider's fields; `actor` is the editor. Throws 404
   * if the assistant provider doesn't exist or is deleted.
   */
  async update(
    id: number,
    body: AssistantProviderBody,
    actor: Actor,
  ): Promise<AssistantProviderDetail> {
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      const result = await tx
        .update(assistantProvider)
        .set({
          name: body.name,
          kind: body.kind,
          baseUrl: body.baseUrl,
          apiKeyEnv: body.apiKeyEnv,
          enabled: body.enabled,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(assistantProvider.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('assistantProviders.notFound'));
      }
    });
  }

  /**
   * Deletes an assistant provider logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(assistantProvider)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(assistantProvider.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('assistantProviders.notFound'));
      }
    });
  }
}
