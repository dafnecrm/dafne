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
  ASSISTANT_MODEL_FILTER_FIELDS,
  type AssistantModelFilterField,
  type AssistantModelBody,
  type AssistantModelDetail,
  type AssistantModelsList,
  type ListAssistantModelsQuery,
  msg,
} from '@dafne/contracts';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
} from '@dafne/backend-crud';

export const ASSISTANT_MODELS_DEFAULT_PAGE_SIZE = 20;

const { assistantModel } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<
  Record<AssistantModelFilterField, (value: string) => number | string>
> = {
  id: Number,
  providerId: Number,
};

/** Assistant models that haven't been deleted. */
const notDeleted = isNull(assistantModel.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class AssistantModelsService implements CrudService<
  number,
  ListAssistantModelsQuery,
  AssistantModelsList,
  AssistantModelBody,
  AssistantModelDetail
> {
  /** Runs the writes with the hooks registered on `assistant-models`. */
  private readonly hooks: CrudHooks<
    number,
    AssistantModelBody,
    AssistantModelDetail
  >;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
  ) {
    this.hooks = registry.for('assistant-models', {
      db,
      load: (id, tx) => this.get(id, tx),
    });
  }

  /**
   * Lists assistant models that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(
    query: ListAssistantModelsQuery = {},
  ): Promise<AssistantModelsList> {
    const {
      limit = ASSISTANT_MODELS_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'desc',
    } = query;
    const { db } = this;
    const filters = ASSISTANT_MODEL_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [
        exact
          ? eq(assistantModel[field] as Column, exact(value))
          : ilike(assistantModel[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [assistantModels, total] = await Promise.all([
      db
        .select({
          id: assistantModel.id,
          providerId: assistantModel.providerId,
          modelId: assistantModel.modelId,
          label: assistantModel.label,
          supportsTools: assistantModel.supportsTools,
          options: assistantModel.options,
          enabled: assistantModel.enabled,
          createdAt: assistantModel.createdAt,
          updatedAt: assistantModel.updatedAt,
        })
        .from(assistantModel)
        .where(where)
        .orderBy(direction(assistantModel[sortBy]), asc(assistantModel.id))
        .limit(limit)
        .offset(offset),
      db.$count(assistantModel, where),
    ]);

    return { items: assistantModels, total, limit, offset };
  }

  /**
   * One assistant model that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async get(id: number, db: Executor = this.db): Promise<AssistantModelDetail> {
    const found = await db.query.assistantModel.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) {
      throw new NotFoundException(msg('assistantModels.notFound'));
    }
    return found;
  }

  /**
   * Creates an assistant model; `actor` is the creator. Runs the hooks registered on
   * `assistant-models` (CrudHooksModule.forFeature), in one transaction.
   */
  async create(
    body: AssistantModelBody,
    actor: Actor,
  ): Promise<AssistantModelDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    return this.hooks.create({ body, actor }, async ({ tx, body }) => {
      // The id is serial: the database picks it.
      const [{ id }] = await tx
        .insert(assistantModel)
        .values({
          providerId: body.providerId,
          modelId: body.modelId,
          label: body.label,
          supportsTools: body.supportsTools,
          options: body.options,
          enabled: body.enabled,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: assistantModel.id });
      return id;
    });
  }

  /**
   * Replaces an assistant model's fields; `actor` is the editor. Throws 404
   * if the assistant model doesn't exist or is deleted.
   */
  async update(
    id: number,
    body: AssistantModelBody,
    actor: Actor,
  ): Promise<AssistantModelDetail> {
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      const result = await tx
        .update(assistantModel)
        .set({
          providerId: body.providerId,
          modelId: body.modelId,
          label: body.label,
          supportsTools: body.supportsTools,
          options: body.options,
          enabled: body.enabled,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(assistantModel.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('assistantModels.notFound'));
      }
    });
  }

  /**
   * Deletes an assistant model logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(assistantModel)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(assistantModel.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('assistantModels.notFound'));
      }
    });
  }
}
