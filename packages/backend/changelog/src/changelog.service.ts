import type { Executor } from '@dafne/backend-crud';
import type { Database } from '@dafne/backend-database';
import { user } from '@dafne/backend-database-auth';
import { change, type ChangeFields } from '@dafne/backend-database-changelog';
import type { ChangeOperation, ChangesList, ListChangesQuery } from '@dafne/contracts';
import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, desc, eq } from 'drizzle-orm';

export const CHANGES_DEFAULT_PAGE_SIZE = 20;

/** One change to record. */
export interface ChangeRecord {
  /** The resource, as registered with CrudHooks (e.g. `sales-orders`). */
  resource: string;
  recordId: unknown;
  operation: ChangeOperation;
  changes: ChangeFields;
  /** Who made it, when a user did. */
  actorId?: string | null;
}

/** Writes and reads the change log ("changelog"."change"). */
@Injectable()
export class ChangelogService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Records a change through `executor`: pass the write's transaction, so
   * the change is saved (or rolled back) with it.
   */
  async record(executor: Executor, { resource, recordId, operation, changes, actorId }: ChangeRecord): Promise<void> {
    await executor.insert(change).values({
      resource,
      recordId: String(recordId),
      operation,
      changes,
      actorId: actorId ?? null,
    });
  }

  /** The changes of a record, newest first, with who made them. */
  async list(resource: string, recordId: unknown, query: ListChangesQuery = {}): Promise<ChangesList> {
    const { limit = CHANGES_DEFAULT_PAGE_SIZE, offset = 0 } = query;
    const where = and(eq(change.resource, resource), eq(change.recordId, String(recordId)));
    const [items, total] = await Promise.all([
      this.db
        .select({
          id: change.id,
          operation: change.operation,
          changedAt: change.changedAt,
          actor: { id: user.id, name: user.name },
          changes: change.changes,
        })
        .from(change)
        .leftJoin(user, eq(user.id, change.actorId))
        .where(where)
        .orderBy(desc(change.id))
        .limit(limit)
        .offset(offset),
      this.db.$count(change, where),
    ]);
    return { items, total, limit, offset };
  }
}
