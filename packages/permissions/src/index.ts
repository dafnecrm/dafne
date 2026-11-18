import { createMongoAbility, type MongoAbility } from '@casl/ability';
import type { MyPermissions, Permission, PermissionAction, PermissionSubject } from '@dafne/contracts';

/*
 * What a user can do, as a CASL ability: the same on the backend (the
 * guards, @Can) and on the frontend (<Can>, hiding buttons), built from the
 * same data, GET /me/permissions's `{ admin, permissions }`.
 *
 * Relative imports end in .ts: the frontend compiles these sources.
 */

export type AppAction = PermissionAction | 'manage';
export type AppSubject = PermissionSubject | 'all';
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

/** Admins can do everything; everyone else, their groups' permissions. */
export function abilityFor({ admin, permissions }: MyPermissions): AppAbility {
  if (admin) {
    return createMongoAbility<AppAbility>([{ action: 'manage', subject: 'all' }]);
  }
  return createMongoAbility<AppAbility>(
    permissions.map((permission: Permission) => {
      const [subject, action] = permission.split('.') as [PermissionSubject, PermissionAction];
      return { action, subject };
    }),
  );
}
