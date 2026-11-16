import type { ChangeFields } from '@dafne/backend-database-changelog';
import type { Database } from '@dafne/backend-database';
import { ChangelogService, type ChangelogExecutor } from './changelog.service.js';

/** An executor whose select returns `history` (oldest first) and whose insert is recorded. */
function executor(history: ChangeFields[]) {
  const values = vi.fn();
  const query = {
    from: () => query,
    where: () => query,
    orderBy: () => Promise.resolve(history.map((changes) => ({ changes }))),
  };
  const db = { select: () => query, insert: () => ({ values }) } as unknown as ChangelogExecutor;
  return { db, values };
}

const service = new ChangelogService({} as Database);
const base = { resource: 'users', recordId: 'u1', actorId: 'admin' };

describe('ChangelogService.recordSnapshot', () => {
  it('logs a create with the fields that have a value', async () => {
    const { db, values } = executor([]);
    await service.recordSnapshot(db, { ...base, operation: 'create', snapshot: { name: 'A', role: null } });
    expect(values).toHaveBeenCalledWith({
      resource: 'users',
      recordId: 'u1',
      operation: 'create',
      changes: { name: { from: null, to: 'A' } },
      actorId: 'admin',
    });
  });

  it('logs an update against the latest logged values', async () => {
    const { db, values } = executor([
      { name: { from: null, to: 'A' }, role: { from: null, to: 'user' } },
      { name: { from: 'A', to: 'B' } },
    ]);
    await service.recordSnapshot(db, { ...base, operation: 'update', snapshot: { name: 'B', role: 'admin' } });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'update', changes: { role: { from: 'user', to: 'admin' } } }),
    );
  });

  it('logs nothing when no logged field changed', async () => {
    const { db, values } = executor([{ name: { from: null, to: 'A' } }]);
    await service.recordSnapshot(db, { ...base, operation: 'update', snapshot: { name: 'A' } });
    expect(values).not.toHaveBeenCalled();
  });

  it('logs a delete with no fields', async () => {
    const { db, values } = executor([]);
    await service.recordSnapshot(db, { ...base, operation: 'delete', snapshot: { name: 'A' } });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ operation: 'delete', changes: {} }));
  });
});
