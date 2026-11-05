import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_ANONYMOUS, OPTIONAL_AUTH, ROLES } from './decorators.js';
import type { SessionClient } from './session.client.js';
import { SessionGuard } from './session.guard.js';
import type { UserSession } from './session.types.js';

const session = (apps: Record<string, string>, role: string | null = null): UserSession => ({
  user: { id: 'u1', name: 'Ada', email: 'ada@example.com', emailVerified: true, role, firstname: 'Ada', lastname: 'L', apps },
  session: { id: 's1', userId: 'u1', expiresAt: '2030-01-01' },
});

function setup(found: UserSession | null, metadata: Record<string, unknown> = {}) {
  const reflector = { getAllAndOverride: (key: string) => metadata[key] } as unknown as Reflector;
  const sessions = { get: vi.fn(async () => found) } as unknown as SessionClient;
  const guard = new SessionGuard(reflector, sessions, { app: 'sales' });
  const request: Record<string, unknown> = { headers: { cookie: 'dafne.session_token=x' } };
  const context = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { guard, request, context, sessions };
}

describe('SessionGuard', () => {
  it('lets in a user of the app and sets the session', async () => {
    const s = session({ sales: 'user' });
    const { guard, context, request } = setup(s);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.session).toBe(s);
  });

  it('refuses without a session (401) and without the app (403)', async () => {
    await expect(setup(null).guard.canActivate(setup(null).context)).rejects.toBeInstanceOf(UnauthorizedException);
    const other = setup(session({ reporting: 'user' }));
    await expect(other.guard.canActivate(other.context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets global admins in, and checks @Roles against the app role', async () => {
    const admin = setup(session({}, 'admin'), { [ROLES]: ['admin'] });
    await expect(admin.guard.canActivate(admin.context)).resolves.toBe(true);
    const member = setup(session({ sales: 'user' }), { [ROLES]: ['admin'] });
    await expect(member.guard.canActivate(member.context)).rejects.toBeInstanceOf(ForbiddenException);
    const appAdmin = setup(session({ sales: 'admin' }), { [ROLES]: ['admin'] });
    await expect(appAdmin.guard.canActivate(appAdmin.context)).resolves.toBe(true);
  });

  it('allows anonymous and optional routes without a session', async () => {
    for (const key of [ALLOW_ANONYMOUS, OPTIONAL_AUTH]) {
      const { guard, context } = setup(null, { [key]: true });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });

  it("doesn't ask apps/auth without a cookie", async () => {
    const { guard, context, request, sessions } = setup(session({ sales: 'user' }), { [ALLOW_ANONYMOUS]: true });
    request.headers = {};
    await guard.canActivate(context);
    expect(sessions.get).not.toHaveBeenCalled();
  });
});
