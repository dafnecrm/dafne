import type { Database } from '@dafne/backend-database';
import type { SessionUser } from '@dafne/backend-session';
import type { Type } from '@nestjs/common';

/** A database transaction: every write of a transition goes through it. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** What guards, hooks and the transition get. */
export interface TransitionContext<S extends string = string, Id = unknown> {
  /** The id of the record that changes status. */
  id: Id;
  /** Its status now. */
  from: S;
  /** The status it moves to. */
  to: S;
  /** The transition's transaction: a throw rolls back everything in it. */
  tx: Transaction;
  /** Who asked for the change, when there is a user. */
  user?: SessionUser;
}

/**
 * Checked before anything else: false (or a throw) stops the transition,
 * with nothing written. False becomes a 403.
 */
export interface TransitionGuard<S extends string = string, Id = unknown> {
  canTransition(context: TransitionContext<S, Id>): boolean | Promise<boolean>;
}

/** Runs before (pre) or after (post) the transition: a throw is a failure. */
export interface TransitionHook<S extends string = string, Id = unknown> {
  run(context: TransitionContext<S, Id>): void | Promise<void>;
}

/** The aspects of one passage from a status to another, each run in order. */
export interface TransitionConfig<S extends string = string, Id = unknown> {
  guards?: Type<TransitionGuard<S, Id>>[];
  pre?: Type<TransitionHook<S, Id>>[];
  post?: Type<TransitionHook<S, Id>>[];
}

/**
 * The statuses a record can move to from each status, with the aspects of
 * each passage: `{ draft: { open: { guards: [...] }, cancelled: {} } }`.
 * A status missing here is final.
 */
export type StatesConfig<S extends string = string, Id = unknown> = Partial<
  Record<S, Partial<Record<S, TransitionConfig<S, Id>>>>
>;

/** Options of `StateMachine.transition`. */
export interface TransitionOptions {
  /** Who asks for the change; guards and hooks see it in the context. */
  user?: SessionUser;
  /**
   * A transaction to run in, so the change is part of the caller's own
   * writes. Without it the machine opens one.
   */
  tx?: Transaction;
}
