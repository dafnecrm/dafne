import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { PermissionsVersion } from '@dafne/backend-user-groups/version';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { schema, type Database } from '@dafne/backend-database';
import type { SessionUser } from '@dafne/backend-session';
import { isGlobalAdmin, PERMISSION_KEYS, type MyPermissions, type Permission } from '@dafne/contracts';
import { abilityFor, type AppAbility } from '@dafne/permissions';

const { userGroup, userGroupMember, userGroupPermission } = schema;

/** How long a user's permissions are kept; a change to any group drops them. */
const TTL_MS = 60_000;

/**
 * What a user can do in this app, from its permissions of their groups
 * (auth.user_group, shared by every app; the session carries them as
 * `user.groups`), plus the all-users groups' if they have access to the app
 * (app_access). Admins, global or of the app, can do everything. Cached per
 * user and groups; every write to a group (its members in apps/auth, its
 * permissions here) bumps PermissionsVersion, so a change applies at once
 * on every instance and app sharing the cache (Redis).
 */
@Injectable()
export class PermissionsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly version: PermissionsVersion,
  ) {}

  /** The admin flag and permissions of `user`, as GET /me/permissions answers. */
  async of(user: SessionUser, app = 'sales'): Promise<MyPermissions> {
    if (isGlobalAdmin(user.role) || user.apps?.[app] === 'admin') {
      return { admin: true, permissions: [] };
    }
    const version = await this.version.current();
    // The groups are in the key: a session cached by SessionClient may still
    // carry the old ones after the bump, and mustn't fill the new version.
    const groups = user.groups?.join(',') ?? '-';
    const key = `permissions:${app}:${version}:${user.id}:${groups}`;
    const cached = await this.cache.get<Permission[]>(key);
    if (cached) {
      return { admin: false, permissions: cached };
    }
    // A session without groups (an older apps/auth) falls back to a query.
    const member = user.groups
      ? inArray(userGroup.id, user.groups)
      : sql`exists (select 1 from ${userGroupMember} where ${userGroupMember.groupId} = ${userGroup.id} and ${userGroupMember.userId} = ${user.id})`;
    const rows = await this.db
      .selectDistinct({ permission: userGroupPermission.permission })
      .from(userGroupPermission)
      .innerJoin(userGroup, eq(userGroup.id, userGroupPermission.groupId))
      .where(
        and(
          isNull(userGroup.deletedAt),
          // The session carries the user's apps (app_access): the all-users
          // groups apply only to those who can use this app.
          user.apps?.[app] ? or(eq(userGroup.allUsers, true), member) : member,
        ),
      );
    // Permissions removed from the catalog since are ignored.
    const permissions = rows
      .map((row) => row.permission as Permission)
      .filter((permission) => PERMISSION_KEYS.includes(permission));
    await this.cache.set(key, permissions, TTL_MS);
    return { admin: false, permissions };
  }

  /** The CASL ability of `user`. */
  async abilityFor(user: SessionUser): Promise<AppAbility> {
    return abilityFor(await this.of(user));
  }

  /** Drops every cached permission: call it after a write to groups. */
  async invalidate(): Promise<void> {
    await this.version.bump();
  }
}
