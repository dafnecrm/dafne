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
 * What a guard answers: true lets the transition go on; false stops it with
 * the generic `fsm.transitionForbidden` message; a string stops it with that
 * message key instead (e.g. `msg('salesOrders.items.enterAtLeastOneItem')`).
 */
export type TransitionGuardResult = boolean | string;

/**
 * Checked before anything else: false, a message (or a throw) stops the
 * transition, with nothing written. False and a message become a 403; throw
 * to answer with another error.
 */
export interface TransitionGuard<S extends string = string, Id = unknown> {
  canTransition(context: TransitionContext<S, Id>): TransitionGuardResult | Promise<TransitionGuardResult>;
}

/**
 * What a hook answers: nothing lets the transition go on; a string stops it
 * with that message key (e.g. `msg('salesOrders.items.enterAtLeastOneItem')`).
 */
export type TransitionHookResult = void | string;

/**
 * Runs before (pre) or after (post) the transition. A message (or a throw)
 * is a failure and rolls everything back: a message becomes a 403; throw to
 * answer with another error.
 */
export interface TransitionHook<S extends string = string, Id = unknown> {
  run(context: TransitionContext<S, Id>): TransitionHookResult | Promise<TransitionHookResult>;
}

/** The aspects of one passage from a status to another, each run in order. */
export interface TransitionConfig<S extends string = string, Id = unknown> {
  guards?: Type<TransitionGuard<S, Id>>[];
  pre?: Type<TransitionHook<S, Id>>[];
  post?: Type<TransitionHook<S, Id>>[];
}

/**
 * Hooks of every transition of a machine (e.g. a change log), run after
 * the transition's own pre and post hooks.
 */
export type EveryTransitionHooks<S extends string = string, Id = unknown> = Pick<TransitionConfig<S, Id>, 'pre' | 'post'>;

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
