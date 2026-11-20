import type { SessionUser } from '@dafne/backend-session';
import { PermissionsVersion } from '@dafne/backend-user-groups/version';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { PermissionsService } from './permissions.service.js';

const user = (role: string | null, apps: Record<string, string> = { sales: 'user' }, groups?: number[]) =>
  ({ id: 'u1', role, apps, groups }) as unknown as SessionUser;

function setup(rows: { permission: string }[]) {
  const store = new Map<string, unknown>();
  const cache = {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: unknown) => void store.set(key, value)),
  };
  const query = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(async (_condition: SQL) => rows) };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  const db = { selectDistinct: vi.fn(() => query) };
  const service = new PermissionsService(db as never, cache as never, new PermissionsVersion(cache as never));
  /** The SQL of the last query's condition. */
  const where = () => new PgDialect().sqlToQuery(query.where.mock.calls.at(-1)![0]).sql;
  return { service, db, store, where };
}

describe('PermissionsService', () => {
  it('lets global and app admins do everything, without a query', async () => {
    const { service, db } = setup([]);
    await expect(service.of(user('admin'))).resolves.toEqual({ admin: true, permissions: [] });
    await expect(service.of(user('super-admin'))).resolves.toEqual({ admin: true, permissions: [] });
    await expect(service.of(user('user', { sales: 'admin' }))).resolves.toEqual({ admin: true, permissions: [] });
    expect(db.selectDistinct).not.toHaveBeenCalled();
  });

  it("gives others their groups' permissions, dropping unknown ones", async () => {
    const { service } = setup([{ permission: 'Customer.create' }, { permission: 'Customer.fly' }]);
    await expect(service.of(user('user'))).resolves.toEqual({ admin: false, permissions: ['Customer.create'] });
    const ability = await service.abilityFor(user('user'));
    expect(ability.can('create', 'Customer')).toBe(true);
    expect(ability.can('delete', 'Customer')).toBe(false);
  });

  it('caches them until a group changes', async () => {
    const { service, db } = setup([{ permission: 'Customer.create' }]);
    await service.of(user('user'));
    await service.of(user('user'));
    expect(db.selectDistinct).toHaveBeenCalledTimes(1);

    await service.invalidate();
    await service.of(user('user'));
    expect(db.selectDistinct).toHaveBeenCalledTimes(2);
  });

  it('applies the all-users groups only to the users of the app (app_access)', async () => {
    const { service, where } = setup([]);
    await service.of(user('user'));
    expect(where()).toContain('"all_users" = $');
    // Through @OptionalAuth(), say: no sales in their apps.
    await service.of({ ...user('user', {}), id: 'u2' } as SessionUser);
    expect(where()).not.toContain('"all_users"');
  });

  it('reads the groups from auth, the permissions from sales, without groups in the session', async () => {
    const { service, where } = setup([]);
    await service.of(user('user'));
    expect(where()).toContain('"auth"."user_group_member"');
  });

  it("takes the user's groups from the session", async () => {
    const { service, where } = setup([]);
    await service.of(user('user', { sales: 'user' }, [1, 2]));
    expect(where()).toContain('"user_group"."id" in ($');
    expect(where()).not.toContain('"user_group_member"');
  });

  it('caches by groups too, so a session with new groups asks again', async () => {
    const { service, db } = setup([]);
    await service.of(user('user', { sales: 'user' }, [1]));
    await service.of(user('user', { sales: 'user' }, [1]));
    expect(db.selectDistinct).toHaveBeenCalledTimes(1);

    await service.of(user('user', { sales: 'user' }, [1, 2]));
    expect(db.selectDistinct).toHaveBeenCalledTimes(2);
  });
});
