import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { adminAc, defaultAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';
import { ADMIN_ROLES, isSuperAdmin, SUPER_ADMIN_ROLE } from '@dafne/contracts';

/**
 * The admin plugin's roles. A super-admin can do all an admin can, plus
 * impersonate admins; what's above that (the AI assistant's settings) is
 * checked by the apps (`@SuperAdmin()`, `@dafne/backend-session`).
 */
export const adminPluginOptions = {
  roles: {
    user: userAc,
    admin: adminAc,
    [SUPER_ADMIN_ROLE]: defaultAc.newRole({
      user: [...defaultStatements.user],
      session: [...defaultStatements.session],
    }),
  },
  adminRoles: [...ADMIN_ROLES],
};

/** Admin endpoints that act on another user (`body.userId`). */
const TARGET_PATHS = new Set([
  '/admin/set-role',
  '/admin/update-user',
  '/admin/ban-user',
  '/admin/unban-user',
  '/admin/remove-user',
  '/admin/set-user-password',
  '/admin/impersonate-user',
  '/admin/revoke-user-sessions',
]);

/** Admin endpoints that can grant a role (`body.role` or `body.data.role`). */
const GRANT_PATHS = new Set(['/admin/create-user', '/admin/set-role', '/admin/update-user']);

interface EscalationCheck {
  path: string;
  /** The caller's role (null without a session). */
  actorRole: string | null | undefined;
  /** The role being granted, if any. */
  grantedRole: unknown;
  /** The role of the user acted on, if any. */
  targetRole: string | null | undefined;
}

/**
 * Whether a call must be refused because only a super-admin may make it:
 * granting super-admin, or acting on a super-admin. Calls without a session
 * (server-side, e.g. the users API) are the caller's to check.
 */
export function isEscalation({ path, actorRole, grantedRole, targetRole }: EscalationCheck): boolean {
  if (actorRole === null || actorRole === undefined || isSuperAdmin(actorRole)) {
    return false;
  }
  const granted =
    typeof grantedRole === 'string' || Array.isArray(grantedRole) ? (grantedRole as string | string[]) : null;
  if (GRANT_PATHS.has(path) && isSuperAdmin(granted)) {
    return true;
  }
  return TARGET_PATHS.has(path) && isSuperAdmin(targetRole);
}

/** Before hook: refuses escalations with 403 (SUPER_ADMIN_REQUIRED). */
export const superAdminGuard = createAuthMiddleware(async (ctx) => {
  if (!GRANT_PATHS.has(ctx.path) && !TARGET_PATHS.has(ctx.path)) {
    return;
  }
  const session = await getSessionFromCtx(ctx);
  if (!session) {
    return;
  }
  const body = (ctx.body ?? {}) as { userId?: unknown; role?: unknown; data?: { role?: unknown } };
  const target =
    TARGET_PATHS.has(ctx.path) && typeof body.userId === 'string'
      ? await ctx.context.internalAdapter.findUserById(body.userId)
      : null;
  const escalation = isEscalation({
    path: ctx.path,
    actorRole: (session.user as { role?: string | null }).role ?? 'user',
    grantedRole: body.role ?? body.data?.role,
    targetRole: (target as { role?: string | null } | null)?.role,
  });
  if (escalation) {
    throw new APIError('FORBIDDEN', {
      code: 'SUPER_ADMIN_REQUIRED',
      message: 'Only a super-admin can grant the super-admin role or change a super-admin.',
    });
  }
});
