import type { Transaction, TransitionContext } from './fsm.types.js';

/**
 * The resource-specific part of a state machine: how to read a record's
 * status and how to change it. Implement it as an `@Injectable()` and pass
 * it to `FsmModule.forFeature`.
 */
export abstract class StateTransition<S extends string = string, Id = unknown> {
  /**
   * The record's status, read in `tx`. Lock the row (`SELECT … FOR
   * UPDATE`) so two transitions can't run on it at once; throw (e.g. a
   * 404) when the record doesn't exist.
   */
  abstract currentStatus(id: Id, tx: Transaction): Promise<S>;

  /** Moves the record from `context.from` to `context.to`, in `context.tx`. */
  abstract execute(context: TransitionContext<S, Id>): Promise<void>;
}
