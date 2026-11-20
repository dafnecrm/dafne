import { NotFoundException } from '@nestjs/common';
import { GroupPermissionsService } from './group-permissions.service.js';

function setup({ group = [{ id: 1 }], granted = [{ permission: 'Customer.create' }] } = {}) {
  // select().from().where() finds the group; …orderBy() lists its permissions.
  const query = { from: vi.fn(), where: vi.fn(), orderBy: vi.fn(async () => granted) };
  query.from.mockReturnValue(query);
  query.where.mockImplementation(() => Object.assign(Promise.resolve(group), { orderBy: query.orderBy }));
  const insert = { values: vi.fn(async () => undefined) };
  const remove = { where: vi.fn(async () => undefined) };
  const db = {
    select: vi.fn(() => query),
    insert: vi.fn(() => insert),
    delete: vi.fn(() => remove),
    transaction: vi.fn((run: (tx: unknown) => unknown) => run(db)),
  };
  const permissions = { invalidate: vi.fn() };
  return { service: new GroupPermissionsService(db as never, permissions as never), db, insert, permissions };
}

describe('GroupPermissionsService', () => {
  it("returns a group's permissions", async () => {
    const { service } = setup();
    await expect(service.get(1)).resolves.toEqual({ groupId: 1, permissions: ['Customer.create'] });
  });

  it('replaces them, then drops the cached ones', async () => {
    const { service, db, insert, permissions } = setup();
    await service.replace(1, { permissions: ['Customer.create', 'Customer.update'] });
    expect(db.delete).toHaveBeenCalled();
    expect(insert.values).toHaveBeenCalledWith([
      { groupId: 1, permission: 'Customer.create' },
      { groupId: 1, permission: 'Customer.update' },
    ]);
    expect(permissions.invalidate).toHaveBeenCalled();
  });

  it('can empty them', async () => {
    const { service, db } = setup({ granted: [] });
    await service.replace(1, { permissions: [] });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('throws 404 for a missing or deleted group, writing nothing', async () => {
    const { service, db, permissions } = setup({ group: [] });
    await expect(service.get(9)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.replace(9, { permissions: [] })).rejects.toBeInstanceOf(NotFoundException);
    expect(db.delete).not.toHaveBeenCalled();
    expect(permissions.invalidate).not.toHaveBeenCalled();
  });
});
