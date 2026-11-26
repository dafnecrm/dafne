import { schema } from '@dafne/backend-database';
import type { Transaction } from '@dafne/backend-fsm';
import type { SessionUser } from '@dafne/backend-session';
import { NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ActivityTransition } from './activity.transition.js';

const { activity } = schema;

describe('ActivityTransition', () => {
  const transition = new ActivityTransition();
  // Stand-ins for select().from().where().for() and update().set().where()
  const select = { from: vi.fn(), where: vi.fn(), for: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn() };
  const tx = { select: vi.fn(), update: vi.fn() };
  const user = { id: 'u1' } as SessionUser;

  beforeEach(() => {
    vi.resetAllMocks();
    tx.select.mockReturnValue(select);
    select.from.mockReturnValue(select);
    select.where.mockReturnValue(select);
    tx.update.mockReturnValue(update);
    update.set.mockReturnValue(update);
  });

  it('reads the status, locking the row', async () => {
    select.for.mockResolvedValue([{ status: 'open' }]);
    await expect(transition.currentStatus(1, tx as unknown as Transaction)).resolves.toBe('open');
    expect(select.for).toHaveBeenCalledWith('update');
  });

  it('throws 404 when the activity is missing or deleted', async () => {
    select.for.mockResolvedValue([]);
    await expect(transition.currentStatus(1, tx as unknown as Transaction)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('closing records who completed it and when', async () => {
    await transition.execute({ id: 1, from: 'open', to: 'closed', tx: tx as unknown as Transaction, user });

    const values = update.set.mock.calls[0][0];
    expect(values).toMatchObject({ status: 'closed', completedById: 'u1', updatedById: 'u1' });
    expect(values.completedAt).toBeInstanceOf(Date);
    expect(update.where).toHaveBeenCalledWith(eq(activity.id, 1));
  });

  it('reopening clears it', async () => {
    await transition.execute({ id: 1, from: 'closed', to: 'open', tx: tx as unknown as Transaction, user });

    expect(update.set.mock.calls[0][0]).toMatchObject({
      status: 'open',
      completedAt: null,
      completedById: null,
    });
  });
});
