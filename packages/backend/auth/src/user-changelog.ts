import type { ChangelogService } from '@dafne/backend-changelog';
import type { AuthDatabase } from '@dafne/backend-database-auth';
import { Logger } from '@nestjs/common';

/** The users' name in the change log (GET /users/:id/changes). */
export const USERS_RESOURCE = 'users';

/**
 * The logged fields of a user. Keep them in line with the baseline
 * migration of @dafne/backend-database-changelog (*_changelog-users).
 */
export const USER_CHANGELOG_FIELDS = [
  'name',
  'firstname',
  'lastname',
  'email',
  'role',
  'banned',
  'emailVerified',
] as const;

type Operation = 'create' | 'update' | 'delete';

/** What Better Auth's database hooks get: the row, and the endpoint's context (null outside a request). */
type HookContext = { context?: { session?: { user?: { id?: string } } | null } } | null | undefined;

const logger = new Logger('UserChangelog');

/** The logged fields of a user row. */
const snapshot = (user: Record<string, unknown>) =>
  Object.fromEntries(USER_CHANGELOG_FIELDS.map((field) => [field, user[field]]));

/**
 * Logs the writes of Better Auth to users: from its `databaseHooks.user`
 * `after` hooks, which run after the write's transaction, so a failure is
 * logged, not thrown (the write is done). The actor is the signed-in user
 * of the request (an admin, or the user themselves), none for a sign-up or
 * a server call.
 */
export function userChangelog(changelog: ChangelogService, db: AuthDatabase) {
  return async (operation: Operation, user: Record<string, unknown> | null, context: unknown) => {
    if (!user || typeof user.id !== 'string') {
      return;
    }
    try {
      await changelog.recordSnapshot(db, {
        resource: USERS_RESOURCE,
        recordId: user.id,
        operation,
        snapshot: snapshot(user),
        actorId: (context as HookContext)?.context?.session?.user?.id ?? null,
      });
    } catch (error) {
      logger.error(`Change log of user ${user.id} (${operation}) failed`, error);
    }
  };
}

export type UserChangelog = ReturnType<typeof userChangelog>;
