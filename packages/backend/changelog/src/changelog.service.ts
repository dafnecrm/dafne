import type { Executor } from '@dafne/backend-crud';
import type { Database } from '@dafne/backend-database';
import { user } from '@dafne/backend-database-auth';
import { change, type ChangeFields } from '@dafne/backend-database-changelog';
import type { ChangeOperation, ChangesList, ListChangesQuery } from '@dafne/contracts';
import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, desc, eq } from 'drizzle-orm';
import { diff } from './diff.js';

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

/**
 * A write to record from the record's logged fields after it, for
 * resources whose writes don't run through CrudHooks (the users, written
 * by Better Auth).
 */
export interface SnapshotRecord {
  resource: string;
  recordId: unknown;
  operation: Exclude<ChangeOperation, 'transition'>;
  /** The logged fields, as they are after the write (ignored for a delete). */
  snapshot: Record<string, unknown>;
  actorId?: string | null;
}

/**
 * What the change log writes and reads with: an app's database (the
 * sales one, or the auth app's), or a transaction of it.
 */
export type ChangelogExecutor = Pick<Executor, 'insert' | 'select'>;

/** Writes and reads the change log ("changelog"."change"). */
@Injectable()
export class ChangelogService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Records a change through `executor`: pass the write's transaction, so
   * the change is saved (or rolled back) with it.
   */
  async record(executor: ChangelogExecutor, { resource, recordId, operation, changes, actorId }: ChangeRecord): Promise<void> {
    await executor.insert(change).values({
      resource,
      recordId: String(recordId),
      operation,
      changes,
      actorId: actorId ?? null,
    });
  }

  /**
   * Records a write from a snapshot: a create logs the fields that have a
   * value, an update those that differ from the log's latest values
   * (nothing if none does), a delete none. For when the previous values
   * aren't known, as in Better Auth's update hooks: the log must hold the
   * record's create (or a baseline, written by a migration).
   */
  async recordSnapshot(
    executor: ChangelogExecutor,
    { resource, recordId, operation, snapshot, actorId }: SnapshotRecord,
  ): Promise<void> {
    let changes = {};
    if (operation === 'create') {
      changes = diff(undefined, snapshot);
    } else if (operation === 'update') {
      changes = diff(await this.latest(executor, resource, recordId), snapshot);
      if (!Object.keys(changes).length) {
        return;
      }
    }
    await this.record(executor, { resource, recordId, operation, changes, actorId });
  }

  /** A record's fields as the log last saw them: each field's latest `to`. */
  private async latest(executor: ChangelogExecutor, resource: string, recordId: unknown) {
    const rows = await executor
      .select({ changes: change.changes })
      .from(change)
      .where(and(eq(change.resource, resource), eq(change.recordId, String(recordId))))
      .orderBy(asc(change.id));
    const values: Record<string, unknown> = {};
    for (const row of rows) {
      for (const [field, { to }] of Object.entries(row.changes)) {
        values[field] = to;
      }
    }
    return values;
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
