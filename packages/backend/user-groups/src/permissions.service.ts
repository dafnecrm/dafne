import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { schema, type Database } from '@dafne/backend-database';
import type { SessionUser } from '@dafne/backend-session';
import { isGlobalAdmin, PERMISSION_KEYS, type MyPermissions, type Permission } from '@dafne/contracts';
import { abilityFor, type AppAbility } from '@dafne/permissions';

const { userGroup, userGroupMember, userGroupPermission } = schema;

/** How long a user's permissions are kept; a change to any group drops them. */
const TTL_MS = 60_000;
const VERSION_KEY = 'permissions:version';

/**
 * What a user can do, from their groups' permissions (plus the all-users
 * groups'). Admins, global or of the app, can do everything. Cached per
 * user; every write to a group bumps a version in the key, so a change
 * applies at once on every instance sharing the cache (Redis).
 */
@Injectable()
export class PermissionsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /** The admin flag and permissions of `user`, as GET /me/permissions answers. */
  async of(user: SessionUser, app = 'sales'): Promise<MyPermissions> {
    if (isGlobalAdmin(user.role) || user.apps?.[app] === 'admin') {
      return { admin: true, permissions: [] };
    }
    const version = (await this.cache.get<number>(VERSION_KEY)) ?? 0;
    const key = `permissions:${version}:${user.id}`;
    const cached = await this.cache.get<Permission[]>(key);
    if (cached) {
      return { admin: false, permissions: cached };
    }
    const rows = await this.db
      .selectDistinct({ permission: userGroupPermission.permission })
      .from(userGroupPermission)
      .innerJoin(userGroup, eq(userGroup.id, userGroupPermission.groupId))
      .where(
        and(
          isNull(userGroup.deletedAt),
          or(
            eq(userGroup.allUsers, true),
            sql`exists (select 1 from ${userGroupMember} where ${userGroupMember.groupId} = ${userGroup.id} and ${userGroupMember.userId} = ${user.id})`,
          ),
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
    const version = (await this.cache.get<number>(VERSION_KEY)) ?? 0;
    await this.cache.set(VERSION_KEY, version + 1, 0);
  }
}
