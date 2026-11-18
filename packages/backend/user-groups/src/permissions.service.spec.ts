import type { SessionUser } from '@dafne/backend-session';
import { PermissionsService } from './permissions.service.js';

const user = (role: string | null, apps: Record<string, string> = { sales: 'user' }) =>
  ({ id: 'u1', role, apps }) as unknown as SessionUser;

function setup(rows: { permission: string }[]) {
  const store = new Map<string, unknown>();
  const cache = {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: unknown) => void store.set(key, value)),
  };
  const query = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(async () => rows) };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  const db = { selectDistinct: vi.fn(() => query) };
  return { service: new PermissionsService(db as never, cache as never), db, store };
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
});
