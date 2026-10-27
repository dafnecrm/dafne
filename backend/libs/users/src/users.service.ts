import { DatabaseService, schema } from '@app/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, like, type SQL } from 'drizzle-orm';
import {
  USER_FILTER_FIELDS,
  type ListUsersQuery,
  type UserDetail,
  type UserFilterField,
  type UsersList,
} from '@app/contracts';

export const DEFAULT_PAGE_SIZE = 20;

const { user } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

const contains =
  (column: typeof user.email | typeof user.name) => (value: string) =>
    like(column, `%${escapeLike(value)}%`);

/** The condition each filter field uses: the backend picks the operator. */
const USER_FILTERS: Record<UserFilterField, (value: string) => SQL> = {
  email: contains(user.email),
  name: contains(user.name),
  role: (value) => eq(user.role, value),
  banned: (value) => eq(user.banned, value === 'true'),
};

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  /** Lists users, paged and sorted, filtered by every field given (AND). */
  async getUsersList(query: ListUsersQuery = {}): Promise<UsersList> {
    const {
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'createdAt',
      sortDirection = 'desc',
    } = query;
    const { db } = this.database;
    const conditions = USER_FILTER_FIELDS.flatMap((field) => {
      const value = query[field];
      return value ? [USER_FILTERS[field](value)] : [];
    });
    const where = conditions.length ? and(...conditions) : undefined;
    const order = sortDirection === 'asc' ? asc : desc;

    const [users, total] = await Promise.all([
      db
        .select()
        .from(user)
        .where(where)
        .orderBy(order(user[sortBy]), asc(user.id))
        .limit(limit)
        .offset(offset),
      db.$count(user, where),
    ]);

    return { users, total, limit, offset };
  }

  /**
   * One user with their Better Auth accounts (sign-in methods, e.g.
   * "credential", "google"), their active sessions and when they were last
   * active. Tokens and passwords are never selected.
   */
  async getUser(id: string): Promise<UserDetail> {
    const found = await this.database.db.query.user.findFirst({
      where: { id },
      with: {
        accounts: {
          columns: { id: true, providerId: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        sessions: {
          columns: {
            id: true,
            createdAt: true,
            updatedAt: true,
            expiresAt: true,
            ipAddress: true,
            userAgent: true,
            impersonatedBy: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    if (!found) throw new NotFoundException('User not found');

    const { accounts, sessions, ...rest } = found;
    const now = new Date();
    return {
      ...rest,
      providers: [...new Set(accounts.map((a) => a.providerId))],
      accounts,
      // Expired sessions still count as activity, but aren't listed.
      lastActiveAt: sessions[0]?.updatedAt ?? null,
      sessions: sessions.filter((s) => s.expiresAt > now),
    };
  }
}
