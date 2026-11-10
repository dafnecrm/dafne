import type { Database } from '@dafne/backend-database';
import { BadRequestException, ForbiddenException, type Type } from '@nestjs/common';
import type { Transaction, TransitionContext, TransitionGuard, TransitionHook } from './fsm.types.js';
import { StateMachine } from './state-machine.js';
import { StateTransition } from './state-transition.js';

type Status = 'draft' | 'open' | 'done';

class Guard implements TransitionGuard<Status, number> {
  canTransition = vi.fn<(context: TransitionContext<Status, number>) => boolean | Promise<boolean>>();
}
class Pre implements TransitionHook<Status, number> {
  run = vi.fn<(context: TransitionContext<Status, number>) => Promise<void>>();
}
class Post implements TransitionHook<Status, number> {
  run = vi.fn<(context: TransitionContext<Status, number>) => Promise<void>>();
}
class Transition extends StateTransition<Status, number> {
  currentStatus = vi.fn<(id: number, tx: Transaction) => Promise<Status>>();
  execute = vi.fn<(context: TransitionContext<Status, number>) => Promise<void>>();
}

describe('StateMachine', () => {
  const tx = { tx: true } as unknown as Transaction;
  // Runs the callback with `tx`, and rejects as a rollback would when it throws.
  const db = { transaction: vi.fn() };
  let guard: Guard;
  let pre: Pre;
  let post: Post;
  let transition: Transition;
  let machine: StateMachine<Status, number>;
  /** The order the aspects ran in. */
  let calls: string[];

  beforeEach(() => {
    vi.resetAllMocks();
    db.transaction.mockImplementation((callback: (tx: Transaction) => unknown) => callback(tx));
    guard = new Guard();
    pre = new Pre();
    post = new Post();
    transition = new Transition();
    calls = [];
    guard.canTransition.mockImplementation(() => (calls.push('guard'), true));
    pre.run.mockImplementation(async () => void calls.push('pre'));
    post.run.mockImplementation(async () => void calls.push('post'));
    transition.currentStatus.mockResolvedValue('draft');
    transition.execute.mockImplementation(async () => void calls.push('execute'));
    machine = new StateMachine<Status, number>(
      'test',
      db as unknown as Database,
      transition,
      { draft: { open: { guards: [Guard], pre: [Pre], post: [Post] } }, open: { done: {} } },
      new Map<Type, unknown>([
        [Guard, guard],
        [Pre, pre],
        [Post, post],
      ]),
    );
  });

  it('lists the next statuses', () => {
    expect(machine.nextStatuses('draft')).toEqual(['open']);
    expect(machine.nextStatuses('done')).toEqual([]);
  });

  it('runs guards, pre hooks, the transition and post hooks, in one transaction', async () => {
    const user = { id: 'u1' } as never;
    await machine.transition(1, 'open', { user });
    expect(calls).toEqual(['guard', 'pre', 'execute', 'post']);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(transition.currentStatus).toHaveBeenCalledWith(1, tx);
    expect(transition.execute).toHaveBeenCalledWith({ id: 1, from: 'draft', to: 'open', tx, user });
  });

  it('does nothing when the record is already in the status', async () => {
    await machine.transition(1, 'draft');
    expect(calls).toEqual([]);
  });

  it('rejects a status that does not follow the current one, before any aspect', async () => {
    await expect(machine.transition(1, 'done')).rejects.toThrow(BadRequestException);
    expect(calls).toEqual([]);
  });

  it('stops when a guard says no', async () => {
    guard.canTransition.mockResolvedValue(false);
    await expect(machine.transition(1, 'open')).rejects.toThrow(ForbiddenException);
    expect(pre.run).not.toHaveBeenCalled();
    expect(transition.execute).not.toHaveBeenCalled();
  });

  it('does not run the transition when a pre hook fails', async () => {
    pre.run.mockRejectedValue(new Error('pre'));
    await expect(machine.transition(1, 'open')).rejects.toThrow('pre');
    expect(transition.execute).not.toHaveBeenCalled();
    expect(post.run).not.toHaveBeenCalled();
  });

  it('fails the transaction (rolls back) when a post hook fails', async () => {
    post.run.mockRejectedValue(new Error('post'));
    await expect(machine.transition(1, 'open')).rejects.toThrow('post');
    expect(transition.execute).toHaveBeenCalled();
    // The error came out of the transaction's callback: drizzle rolls back.
    await expect(db.transaction.mock.results[0].value).rejects.toThrow('post');
  });

  it("runs in the caller's transaction when given one", async () => {
    const own = { own: true } as unknown as Transaction;
    transition.currentStatus.mockResolvedValue('open');
    await machine.transition(1, 'done', { tx: own });
    expect(db.transaction).not.toHaveBeenCalled();
    expect(transition.execute).toHaveBeenCalledWith(expect.objectContaining({ tx: own, from: 'open', to: 'done' }));
  });
});
