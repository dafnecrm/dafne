import { isEscalation } from './super-admin.ts';

describe('isEscalation', () => {
  it('lets only super-admins grant super-admin', () => {
    for (const path of ['/admin/create-user', '/admin/set-role', '/admin/update-user']) {
      expect(isEscalation({ path, actorRole: 'admin', grantedRole: 'super-admin', targetRole: 'user' })).toBe(true);
      expect(isEscalation({ path, actorRole: 'super-admin', grantedRole: 'super-admin', targetRole: 'user' })).toBe(false);
      expect(isEscalation({ path, actorRole: 'admin', grantedRole: 'admin', targetRole: 'user' })).toBe(false);
    }
    expect(isEscalation({ path: '/admin/set-role', actorRole: 'admin', grantedRole: ['user', 'super-admin'], targetRole: 'user' })).toBe(true);
  });

  it('lets only super-admins act on a super-admin', () => {
    for (const path of ['/admin/ban-user', '/admin/remove-user', '/admin/impersonate-user', '/admin/set-user-password']) {
      expect(isEscalation({ path, actorRole: 'admin', grantedRole: undefined, targetRole: 'super-admin' })).toBe(true);
      expect(isEscalation({ path, actorRole: 'super-admin', grantedRole: undefined, targetRole: 'super-admin' })).toBe(false);
      expect(isEscalation({ path, actorRole: 'admin', grantedRole: undefined, targetRole: 'admin' })).toBe(false);
    }
  });

  it('leaves calls without a session and other paths alone', () => {
    expect(isEscalation({ path: '/admin/set-role', actorRole: null, grantedRole: 'super-admin', targetRole: 'user' })).toBe(false);
    expect(isEscalation({ path: '/admin/list-users', actorRole: 'admin', grantedRole: 'super-admin', targetRole: 'super-admin' })).toBe(false);
  });
});
