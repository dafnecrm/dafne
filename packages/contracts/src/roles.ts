/**
 * Global roles (Better Auth's admin plugin, `user.role`). Admins and
 * super-admins see every app and manage users; only super-admins manage
 * what's above that (e.g. the AI assistant's providers, models and agents)
 * and may grant or touch the super-admin role.
 */
export const USER_ROLES = ['user', 'admin', 'super-admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles with every admin permission. */
export const ADMIN_ROLES = ['admin', 'super-admin'] as const satisfies readonly UserRole[];

export const SUPER_ADMIN_ROLE = 'super-admin' satisfies UserRole;

/** A role as Better Auth gives it: one, several comma-separated, or a list. */
export type RoleValue = string | readonly string[] | null | undefined;

const rolesOf = (role: RoleValue): string[] =>
  (typeof role === 'string' ? role.split(',') : (role ?? [])).map((r) => r.trim());

/** Admin or super-admin: every admin permission. */
export const isGlobalAdmin = (role: RoleValue): boolean =>
  rolesOf(role).some((r) => (ADMIN_ROLES as readonly string[]).includes(r));

/** Super-admin only. */
export const isSuperAdmin = (role: RoleValue): boolean =>
  rolesOf(role).includes(SUPER_ADMIN_ROLE);
