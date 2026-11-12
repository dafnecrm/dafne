import { z } from 'zod';
import { pageQuery, type Page } from './common.ts';

/* ---------- Change log (GET /<resource>/:id/changes) ---------- */

/** What happened to a record: a CRUD write, or a status change of its state machine. */
export const CHANGE_OPERATIONS = ['create', 'update', 'delete', 'transition'] as const;
export type ChangeOperation = (typeof CHANGE_OPERATIONS)[number];

/** Query string of GET /<resource>/:id/changes: newest first. */
export const listChangesQuerySchema = z.strictObject({ ...pageQuery });
export type ListChangesQuery = z.output<typeof listChangesQuerySchema>;

/** A field a change touched: its value before and after (JSON values). */
export interface ChangedField {
  from: unknown;
  to: unknown;
}

/** Who made a change; null if since removed (or no user made it). */
export interface ChangeActor {
  id: string;
  name: string;
}

/**
 * One change of a record. `changes` holds only the fields that changed:
 * a create gives their first values (`from` null), a delete none, a
 * transition `{ status: { from, to } }`.
 */
export interface ChangeEntry {
  id: number;
  operation: ChangeOperation;
  changedAt: Date;
  actor: ChangeActor | null;
  changes: Record<string, ChangedField>;
}

/** Response of GET /<resource>/:id/changes. */
export type ChangesList = Page<ChangeEntry>;
