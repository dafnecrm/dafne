import { groupPermissionsBodySchema, PERMISSION_KEYS, permissionsSchema } from './permissions.ts';

describe('permissions', () => {
  it('lists every action of every subject', () => {
    expect(PERMISSION_KEYS).toContain('Customer.create');
    expect(PERMISSION_KEYS).toContain('SalesOrder.changeStatus');
  });

  it('accepts known permissions once, refuses unknown ones', () => {
    expect(permissionsSchema.parse(['Customer.create', 'Customer.create'])).toEqual(['Customer.create']);
    expect(permissionsSchema.safeParse(['Customer.fly']).success).toBe(false);
    expect(permissionsSchema.parse(undefined)).toEqual([]);
  });

  it("parses a group's permissions body, refusing anything else", () => {
    expect(groupPermissionsBodySchema.parse({ permissions: ['Customer.create'] })).toEqual({ permissions: ['Customer.create'] });
    expect(groupPermissionsBodySchema.parse({})).toEqual({ permissions: [] });
    expect(groupPermissionsBodySchema.safeParse({ permissions: [], name: 'x' }).success).toBe(false);
  });
});
