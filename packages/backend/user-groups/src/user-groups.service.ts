import { authSchema, type AuthDatabase } from '@dafne/backend-database-auth';
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
  type MyUserGroup,
  type UserGroupBody,
  type UserGroupDetail,
  type UserGroupsList,
  type ListUserGroupsQuery,
  msg,
} from '@dafne/contracts';
import type { CrudService } from '@dafne/backend-crud';
import { PermissionsVersion } from './permissions-version.js';

export const USER_GROUPS_DEFAULT_PAGE_SIZE = 20;

const { userGroup, userGroupMember, user } = authSchema;

/** The database, or a transaction on it. */
type Executor =
  | AuthDatabase
  | Parameters<Parameters<AuthDatabase['transaction']>[0]>[0];

/** The signed-in user writing (only the id matters). */
interface Actor {
  id: string;
}

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

/** The groups `userId` is a member of. */
const hasMember = (userId: string) =>
  sql`exists (select 1 from ${userGroupMember} where ${userGroupMember.groupId} = ${userGroup.id} and ${userGroupMember.userId} = ${userId})`;

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

/**
 * The user groups and their members, shared by every app (auth schema,
 * served by apps/auth). What a group can do is each app's own
 * (@dafne/backend-permissions). Not through CrudHooks: those run on an
 * app's database (@dafne/backend-crud), and no lib hooks into the groups.
 */
@Injectable()
export class UserGroupsService implements CrudService<
  number,
  ListUserGroupsQuery,
  UserGroupsList,
  UserGroupBody,
  UserGroupDetail
> {
  constructor(
    @InjectDrizzle() private readonly db: AuthDatabase,
    private readonly permissionsVersion: PermissionsVersion,
  ) {}

  /**
   * The groups `userId` is a member of (not deleted), by name, for GET
   * /me/user-groups. Not paged: a user is in few groups. All-users groups
   * have no members: they're left out.
   */
  ofMember(userId: string): Promise<MyUserGroup[]> {
    return this.db
      .select({ id: userGroup.id, name: userGroup.name, description: userGroup.description })
      .from(userGroup)
      .where(and(notDeleted, hasMember(userId)))
      .orderBy(asc(userGroup.name));
  }

  /**
   * Lists user groups that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains), and
   * by `memberId`: the groups that user is in.
   */
  async list(query: ListUserGroupsQuery = {}): Promise<UserGroupsList> {
    const {
      limit = USER_GROUPS_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'desc',
      memberId,
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
    if (memberId) {
      filters.push(hasMember(memberId));
    }
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
   * One user group that isn't deleted, with its members and who created
   * and last updated it. Throws 404 otherwise.
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
    const members = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(userGroupMember)
      .innerJoin(user, eq(user.id, userGroupMember.userId))
      .where(eq(userGroupMember.groupId, id))
      .orderBy(asc(user.name));
    return { ...found, members, memberCount: members.length };
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

  /** Creates an user group with its members; `actor` is the creator. */
  async create(body: UserGroupBody, actor: Actor): Promise<UserGroupDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    const created = await this.db.transaction(async (tx) => {
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
      return this.get(id, tx);
    });
    await this.permissionsVersion.bump();
    return created;
  }

  /**
   * Replaces an user group's fields and members; `actor` is the editor.
   * Throws 404 if the user group doesn't exist or is deleted.
   */
  async update(
    id: number,
    body: UserGroupBody,
    actor: Actor,
  ): Promise<UserGroupDetail> {
    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(userGroup)
        .set({
          name: body.name,
          description: body.description,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(userGroup.id, id), notDeleted))
        .returning({ allUsers: userGroup.allUsers });
      if (!row) {
        throw new NotFoundException(msg('userGroups.notFound'));
      }
      // An all-users group has no member list: it applies to everyone.
      await this.replaceMembers(tx, id, row.allUsers ? [] : body.memberIds);
      return this.get(id, tx);
    });
    await this.permissionsVersion.bump();
    return updated;
  }

  /**
   * Deletes an user group logically: sets deletedAt, so it disappears
   * from the API (and its permissions from every app) but stays in the
   * database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    const now = new Date();
    const result = await this.db
      .update(userGroup)
      .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
      .where(and(eq(userGroup.id, id), notDeleted));
    if (result.rowCount === 0) {
      throw new NotFoundException(msg('userGroups.notFound'));
    }
    await this.permissionsVersion.bump();
  }
}
