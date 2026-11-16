import type { ChangelogService } from '@dafne/backend-changelog';
import type { AuthDatabase } from '@dafne/backend-database-auth';
import { Logger } from '@nestjs/common';
import { userChangelog } from './user-changelog.js';

const db = {} as AuthDatabase;
const recordSnapshot = vi.fn();
const log = userChangelog({ recordSnapshot } as unknown as ChangelogService, db);

const user = {
  id: 'u1',
  name: 'Ada Lovelace',
  firstname: 'Ada',
  lastname: 'Lovelace',
  email: 'ada@example.com',
  emailVerified: true,
  role: 'user',
  banned: false,
  image: null,
  updatedAt: new Date(),
};

beforeEach(() => {
  recordSnapshot.mockReset();
});

describe('userChangelog', () => {
  it('records the logged fields, with the signed-in user as actor', async () => {
    await log('update', user, { context: { session: { user: { id: 'admin' } } } });
    expect(recordSnapshot).toHaveBeenCalledWith(db, {
      resource: 'users',
      recordId: 'u1',
      operation: 'update',
      snapshot: {
        name: 'Ada Lovelace',
        firstname: 'Ada',
        lastname: 'Lovelace',
        email: 'ada@example.com',
        role: 'user',
        banned: false,
        emailVerified: true,
      },
      actorId: 'admin',
    });
  });

  it('has no actor outside a session (sign-up, server calls)', async () => {
    await log('create', user, null);
    expect(recordSnapshot).toHaveBeenCalledWith(db, expect.objectContaining({ operation: 'create', actorId: null }));
  });

  it("doesn't throw when the log fails: the write is done", async () => {
    recordSnapshot.mockRejectedValue(new Error('down'));
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await expect(log('delete', user, null)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('Change log of user u1 (delete) failed', expect.any(Error));
    error.mockRestore();
  });

  it('skips a write with no user', async () => {
    await log('update', null, null);
    expect(recordSnapshot).not.toHaveBeenCalled();
  });
});
