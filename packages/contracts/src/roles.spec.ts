import { isGlobalAdmin, isSuperAdmin } from './roles.ts';

describe('roles', () => {
  it('treats admin and super-admin as global admins', () => {
    expect(isGlobalAdmin('admin')).toBe(true);
    expect(isGlobalAdmin('super-admin')).toBe(true);
    expect(isGlobalAdmin('user')).toBe(false);
    expect(isGlobalAdmin(null)).toBe(false);
    expect(isGlobalAdmin(undefined)).toBe(false);
  });

  it('only super-admin is super-admin', () => {
    expect(isSuperAdmin('super-admin')).toBe(true);
    expect(isSuperAdmin('user, super-admin')).toBe(true);
    expect(isSuperAdmin('admin')).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
  });
});

describe('role lists', () => {
  it('accepts a list of roles', () => {
    expect(isSuperAdmin(['user', 'super-admin'])).toBe(true);
    expect(isGlobalAdmin(['user'])).toBe(false);
  });
});
