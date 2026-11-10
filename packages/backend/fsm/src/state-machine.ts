import type { Database } from '@dafne/backend-database';
import { msg } from '@dafne/contracts';
import { BadRequestException, ForbiddenException, type Type } from '@nestjs/common';
import type { SessionUser } from '@dafne/backend-session';
import type {
  StatesConfig,
  Transaction,
  TransitionConfig,
  TransitionContext,
  TransitionGuard,
  TransitionHook,
  TransitionOptions,
} from './fsm.types.js';
import type { StateTransition } from './state-transition.js';

/**
 * Moves records from a status to another, as `states` allows. Callers get
 * it with `@InjectStateMachine(name)`; `FsmModule.forFeature` builds it.
 */
export class StateMachine<S extends string = string, Id = unknown> {
  constructor(
    readonly name: string,
    private readonly db: Database,
    private readonly stateTransition: StateTransition<S, Id>,
    private readonly states: StatesConfig<S, Id>,
    /** The instances of the guards and hooks in `states`, by class. */
    private readonly aspects: Map<Type, unknown>,
  ) {}

  /** The statuses a record in `from` can move to. */
  nextStatuses(from: S): S[] {
    return Object.keys(this.states[from] ?? {}) as S[];
  }

  /**
   * Moves the record `id` to `to`, in one transaction: guards, pre hooks,
   * the transition, post hooks. Throws 400 if `to` doesn't follow the
   * record's status, 403 if a guard says no or a hook returns a message (with the
   * message they give), or whatever an aspect throws;
   * any failure rolls everything back. Does nothing if the record is
   * already in `to`.
   */
  async transition(id: Id, to: S, options: TransitionOptions = {}): Promise<void> {
    const { tx, user } = options;
    if (tx) return this.run(id, to, tx, user);
    return this.db.transaction((tx) => this.run(id, to, tx, user));
  }

  private async run(id: Id, to: S, tx: Transaction, user?: SessionUser) {
    const from = await this.stateTransition.currentStatus(id, tx);
    // Already there (e.g. a form saved with the same status): nothing to do.
    if (from === to) return;
    const config: TransitionConfig<S, Id> | undefined = this.states[from]?.[to];
    if (!config) throw new BadRequestException(msg('fsm.transitionNotAllowed'));

    const context: TransitionContext<S, Id> = { id, from, to, tx, user };

    for (const guard of this.instances<TransitionGuard<S, Id>>(config.guards)) {
      const result = await guard.canTransition(context);
      if (result === true) continue;
      throw new ForbiddenException(typeof result === 'string' && result ? result : msg('fsm.transitionForbidden'));
    }
    for (const hook of this.instances<TransitionHook<S, Id>>(config.pre)) await this.runHook(hook, context);
    await this.stateTransition.execute(context);
    for (const hook of this.instances<TransitionHook<S, Id>>(config.post)) await this.runHook(hook, context);
  }

  /** Runs a hook: a message it returns fails the transition with it. */
  private async runHook(hook: TransitionHook<S, Id>, context: TransitionContext<S, Id>) {
    const message = await hook.run(context);
    if (typeof message === 'string' && message) throw new ForbiddenException(message);
  }

  private instances<T>(classes: Type<T>[] = []): T[] {
    return classes.map((type) => this.aspects.get(type) as T);
  }
}
