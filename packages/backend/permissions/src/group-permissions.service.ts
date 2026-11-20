import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { schema, type Database } from '@dafne/backend-database';
import {
  msg,
  type GroupPermissions,
  type GroupPermissionsBody,
  type Permission,
} from '@dafne/contracts';
import type { Executor } from '@dafne/backend-crud';
import { PermissionsService } from './permissions.service.js';

const { userGroup, userGroupPermission } = schema;

/**
 * What each group (auth.user_group, shared by every app) can do in this
 * app: sales.user_group_permission. The groups themselves and their
 * members are apps/auth's.
 */
@Injectable()
export class GroupPermissionsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly permissions: PermissionsService,
  ) {}

  /** 404 unless the group exists and isn't deleted. */
  private async assertGroup(db: Executor, groupId: number) {
    const [found] = await db
      .select({ id: userGroup.id })
      .from(userGroup)
      .where(and(eq(userGroup.id, groupId), isNull(userGroup.deletedAt)));
    if (!found) {
      throw new NotFoundException(msg('userGroups.notFound'));
    }
  }

  /** The permissions of a group, sorted. 404 if the group doesn't exist. */
  async get(groupId: number, db: Executor = this.db): Promise<GroupPermissions> {
    await this.assertGroup(db, groupId);
    const rows = await db
      .select({ permission: userGroupPermission.permission })
      .from(userGroupPermission)
      .where(eq(userGroupPermission.groupId, groupId))
      .orderBy(asc(userGroupPermission.permission));
    return { groupId, permissions: rows.map((row) => row.permission as Permission) };
  }

  /** Replaces a group's permissions. 404 if the group doesn't exist. */
  async replace(groupId: number, body: GroupPermissionsBody): Promise<GroupPermissions> {
    const saved = await this.db.transaction(async (tx) => {
      await this.assertGroup(tx, groupId);
      await tx.delete(userGroupPermission).where(eq(userGroupPermission.groupId, groupId));
      if (body.permissions.length) {
        await tx
          .insert(userGroupPermission)
          .values(body.permissions.map((permission) => ({ groupId, permission })));
      }
      return this.get(groupId, tx);
    });
    await this.permissions.invalidate();
    return saved;
  }
}
