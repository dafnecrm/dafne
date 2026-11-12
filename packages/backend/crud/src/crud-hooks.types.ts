import type { Database } from '@dafne/backend-database';
import type { Type } from '@nestjs/common';
import type { Actor } from './crud.js';

/** A database transaction: the write and its pre/post hooks go through it. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** What a service reads with: the database, or a transaction. */
export type Executor = Database | Transaction;

/** The writes that run hooks. */
export type CrudOperation = 'create' | 'update' | 'delete';

/** What hooks get. */
export interface CrudHookContext<Id = unknown, Body = unknown, Detail = unknown> {
  /** The resource, as registered (e.g. `customers`). */
  resource: string;
  operation: CrudOperation;
  /** Who writes. */
  actor: Actor;
  /** The write's transaction: a throw rolls back everything in it. */
  tx: Transaction;
  /** The record's id: given for update and delete, set after the insert for create. */
  id?: Id;
  /**
   * The body of create and update. Pre hooks may change it (its fields, or
   * the whole object): the write saves what they leave.
   */
  body?: Body;
  /** The record before update and delete; read only when the operation has hooks. */
  previous?: Detail;
  /** The record after create and update, from the transaction (post and after-commit hooks). */
  result?: Detail;
}

/** What an after-commit hook gets: the context, without the transaction (it's over). */
export type CrudCommittedContext<Id = unknown, Body = unknown, Detail = unknown> = Omit<
  CrudHookContext<Id, Body, Detail>,
  'tx'
>;

/**
 * What a hook answers: nothing lets the write go on; a string stops it
 * with that message key (a 403), e.g. `msg('customers.hasOpenOrders')`.
 */
export type CrudHookResult = void | string;

/**
 * Runs in the write's transaction, before (pre) or after (post) it. A
 * message (or a throw) fails the write and rolls everything back: a
 * message becomes a 403; throw to answer with another error.
 */
export interface CrudHook<Id = unknown, Body = unknown, Detail = unknown> {
  run(context: CrudHookContext<Id, Body, Detail>): CrudHookResult | Promise<CrudHookResult>;
}

/**
 * Runs after the transaction committed (emails, notifications, calls to
 * other systems): it can't undo the write, and its errors are only logged.
 */
export interface CrudAfterCommitHook<Id = unknown, Body = unknown, Detail = unknown> {
  run(context: CrudCommittedContext<Id, Body, Detail>): void | Promise<void>;
}

/** The hooks of one operation, each run in order. */
export interface CrudOperationHooks {
  pre?: Type<CrudHook>[];
  post?: Type<CrudHook>[];
  afterCommit?: Type<CrudAfterCommitHook>[];
}

/** A resource's hooks by operation: `{ delete: { pre: [NoOpenOrdersHook] } }`. */
export type CrudHooksConfig = Partial<Record<CrudOperation, CrudOperationHooks>>;
