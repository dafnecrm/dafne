import { user } from '@dafne/backend-database-auth';
import { CHANGE_OPERATIONS, type ChangedField } from '@dafne/contracts';
import { bigserial, index, jsonb, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { changelogDb } from './changelog-db.ts';

/** The fields a change touched: `{ notes: { from: 'a', to: 'b' } }`. */
export type ChangeFields = Record<string, ChangedField>;

/**
 * One change of a record of a CRUD resource (`resource`, `record_id`).
 *
 * For queries only: the table is partitioned by `resource` (LIST, with a
 * DEFAULT partition), which drizzle-kit can't express, so the migrations
 * are written by hand (migrations/*_init). Keep the two in line.
 */
export const change = changelogDb.table(
  'change',
  {
    id: bigserial('id', { mode: 'number' }).notNull(),
    /** The resource, as registered with CrudHooks (e.g. `sales-orders`). */
    resource: text('resource').notNull(),
    /** The record's id, as text (ids may be numbers or strings). */
    recordId: text('record_id').notNull(),
    operation: text('operation', { enum: CHANGE_OPERATIONS }).notNull(),
    changes: jsonb('changes').$type<ChangeFields>().notNull(),
    // Nullable so removing a user keeps the changes they made.
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    changedAt: timestamp('changed_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // The partition key must be part of the primary key.
    primaryKey({ columns: [table.resource, table.id] }),
    index('change_record_idx').on(table.resource, table.recordId, table.id.desc()),
  ],
);
