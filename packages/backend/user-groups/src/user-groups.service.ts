import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Injectable, NotFoundException } from '@nestjs/common';

import {
  and,
  asc,
  desc,
  eq,
  isNull,
  ilike,
  type Column,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  USER_GROUP_FILTER_FIELDS,
  type UserGroupFilterField,
  type UserGroupBody,
  type UserGroupDetail,
  type UserGroupsList,
  type ListUserGroupsQuery,
  msg,
  type Permission,
} from '@dafne/contracts';
import { PermissionsService } from './permissions.service.js';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
} from '@dafne/backend-crud';

export const USER_GROUPS_DEFAULT_PAGE_SIZE = 20;

const { userGroup, userGroupMember, userGroupPermission, user } = schema;

/** A group's permissions, as an array (none: empty). */
const permissions = sql<Permission[]>`coalesce((select array_agg(${userGroupPermission.permission} order by ${userGroupPermission.permission}) from ${userGroupPermission} where ${userGroupPermission.groupId} = ${userGroup.id}), '{}')`;

/** How many users a group has, for the list. */
const memberCount = sql<number>`(select count(*) from ${userGroupMember} where ${userGroupMember.groupId} = ${userGroup.id})`.mapWith(Number);

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<
  Record<UserGroupFilterField, (value: string) => number | string>
> = {
  id: Number,
};

/** User groups that haven't been deleted. */
const notDeleted = isNull(userGroup.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

@Injectable()
export class UserGroupsService implements CrudService<
  number,
  ListUserGroupsQuery,
  UserGroupsList,
  UserGroupBody,
  UserGroupDetail
> {
  /** Runs the writes with the hooks registered on `user-groups`. */
  private readonly hooks: CrudHooks<number, UserGroupBody, UserGroupDetail>;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
    private readonly permissionsService: PermissionsService,
  ) {
    this.hooks = registry.for('user-groups', {
      db,
      load: (id, tx) => this.get(id, tx),
    });
  }

  /**
   * Lists user groups that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(query: ListUserGroupsQuery = {}): Promise<UserGroupsList> {
    const {
      limit = USER_GROUPS_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'desc',
    } = query;
    const { db } = this;
    const filters = USER_GROUP_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [
        exact
          ? eq(userGroup[field] as Column, exact(value))
          : ilike(userGroup[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [userGroups, total] = await Promise.all([
      db
        .select({
          id: userGroup.id,
          name: userGroup.name,
          description: userGroup.description,
          memberCount,
          allUsers: userGroup.allUsers,
          permissions,
          createdAt: userGroup.createdAt,
          updatedAt: userGroup.updatedAt,
        })
        .from(userGroup)
        .where(where)
        .orderBy(direction(userGroup[sortBy]), asc(userGroup.id))
        .limit(limit)
        .offset(offset),
      db.$count(userGroup, where),
    ]);

    return { items: userGroups, total, limit, offset };
  }

  /**
   * One user group that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async get(id: number, db: Executor = this.db): Promise<UserGroupDetail> {
    const found = await db.query.userGroup.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) {
      throw new NotFoundException(msg('userGroups.notFound'));
    }
    const [members, granted] = await Promise.all([
      db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(userGroupMember)
        .innerJoin(user, eq(user.id, userGroupMember.userId))
        .where(eq(userGroupMember.groupId, id))
        .orderBy(asc(user.name)),
      db
        .select({ permission: userGroupPermission.permission })
        .from(userGroupPermission)
        .where(eq(userGroupPermission.groupId, id))
        .orderBy(asc(userGroupPermission.permission)),
    ]);
    return {
      ...found,
      members,
      memberCount: members.length,
      permissions: granted.map((row) => row.permission as Permission),
    };
  }

  /**
   * Replaces a group's members with `memberIds`. An id that isn't a user
   * breaks the foreign key: 400 (PostgresErrorInterceptor).
   */
  private async replaceMembers(tx: Executor, groupId: number, memberIds: string[]) {
    await tx.delete(userGroupMember).where(eq(userGroupMember.groupId, groupId));
    if (memberIds.length) {
      await tx.insert(userGroupMember).values(memberIds.map((userId) => ({ groupId, userId })));
    }
  }

  /** Replaces a group's permissions with `permissions`. */
  private async replacePermissions(tx: Executor, groupId: number, permissions: Permission[]) {
    await tx.delete(userGroupPermission).where(eq(userGroupPermission.groupId, groupId));
    if (permissions.length) {
      await tx.insert(userGroupPermission).values(permissions.map((permission) => ({ groupId, permission })));
    }
  }

  /**
   * Creates an user group; `actor` is the creator. Runs the hooks registered on
   * `user-groups` (CrudHooksModule.forFeature), in one transaction.
   */
  async create(body: UserGroupBody, actor: Actor): Promise<UserGroupDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    const created = await this.hooks.create({ body, actor }, async ({ tx, body }) => {
      // The id is serial: the database picks it.
      const [{ id }] = await tx
        .insert(userGroup)
        .values({
          name: body.name,
          description: body.description,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: userGroup.id });
      await this.replaceMembers(tx, id, body.memberIds);
      await this.replacePermissions(tx, id, body.permissions);
      return id;
    });
    await this.permissionsService.invalidate();
    return created;
  }

  /**
   * Replaces an user group's fields; `actor` is the editor. Throws 404
   * if the user group doesn't exist or is deleted.
   */
  async update(
    id: number,
    body: UserGroupBody,
    actor: Actor,
  ): Promise<UserGroupDetail> {
    const updated = await this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      const result = await tx
        .update(userGroup)
        .set({
          name: body.name,
          description: body.description,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(userGroup.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('userGroups.notFound'));
      }
      // An all-users group has no member list: it applies to everyone.
      const [{ allUsers }] = await tx.select({ allUsers: userGroup.allUsers }).from(userGroup).where(eq(userGroup.id, id));
      await this.replaceMembers(tx, id, allUsers ? [] : body.memberIds);
      await this.replacePermissions(tx, id, body.permissions);
    });
    await this.permissionsService.invalidate();
    return updated;
  }

  /**
   * Deletes an user group logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(userGroup)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(userGroup.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('userGroups.notFound'));
      }
    });
    await this.permissionsService.invalidate();
  }
}
