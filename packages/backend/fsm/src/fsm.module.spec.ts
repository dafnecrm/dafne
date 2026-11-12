import { Global, Injectable, Module } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import { FsmModule, InjectStateMachine } from './fsm.module.js';
import type { Transaction, TransitionContext, TransitionGuard, TransitionHook } from './fsm.types.js';
import { StateMachine } from './state-machine.js';
import { StateTransition } from './state-transition.js';

type Status = 'draft' | 'open';

const db = { transaction: vi.fn((callback: (tx: Transaction) => unknown) => callback({} as Transaction)) };

/** Stands in for DatabaseModule, which is global. */
@Global()
@Module({ providers: [{ provide: getDrizzleToken(), useValue: db }], exports: [getDrizzleToken()] })
class FakeDatabaseModule {}

@Injectable()
class Rules {
  allowed = true;
}

@Injectable()
class RulesGuard implements TransitionGuard<Status, number> {
  constructor(private readonly rules: Rules) {}
  canTransition() {
    return this.rules.allowed;
  }
}

@Injectable()
class Transition extends StateTransition<Status, number> {
  executed: TransitionContext<Status, number>[] = [];
  async currentStatus() {
    return 'draft' as const;
  }
  async execute(context: TransitionContext<Status, number>) {
    this.executed.push(context);
  }
}

/** The order the hooks ran in. */
const ran: string[] = [];

@Injectable()
class OwnPostHook implements TransitionHook<Status, number> {
  run() {
    ran.push('own');
  }
}

@Injectable()
class EveryPostHook implements TransitionHook<Status, number> {
  constructor(private readonly rules: Rules) {}
  run({ from, to }: TransitionContext<Status, number>) {
    ran.push(`every ${from}→${to} ${this.rules.allowed}`);
  }
}

@Injectable()
class Caller {
  constructor(@InjectStateMachine('thing') readonly machine: StateMachine<Status, number>) {}
}

describe('FsmModule.forFeature', () => {
  it('gives a state machine whose guards get their dependencies', async () => {
    const module = await Test.createTestingModule({
      imports: [
        FakeDatabaseModule,
        FsmModule.forFeature<Status, number>({
          name: 'thing',
          transition: Transition,
          states: { draft: { open: { guards: [RulesGuard] } } },
          providers: [Rules],
        }),
      ],
      providers: [Caller],
    }).compile();

    const { machine } = module.get(Caller);
    expect(machine).toBeInstanceOf(StateMachine);
    expect(machine.name).toBe('thing');

    await machine.transition(1, 'open');
    const transition = module.get(Transition);
    expect(transition.executed).toEqual([expect.objectContaining({ id: 1, from: 'draft', to: 'open' })]);

    module.get(Rules).allowed = false;
    await expect(machine.transition(1, 'open')).rejects.toThrow();
  });

  it('runs the hooks of every transition after the transition\'s own, with their dependencies', async () => {
    ran.length = 0;
    const module = await Test.createTestingModule({
      imports: [
        FakeDatabaseModule,
        FsmModule.forFeature<Status, number>({
          name: 'thing',
          transition: Transition,
          states: { draft: { open: { post: [OwnPostHook] } } },
          post: [EveryPostHook],
          providers: [Rules],
        }),
      ],
      providers: [Caller],
    }).compile();

    await module.get(Caller).machine.transition(1, 'open');
    expect(ran).toEqual(['own', 'every draft→open true']);
  });
});
