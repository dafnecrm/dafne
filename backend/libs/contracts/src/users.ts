import { z } from 'zod';
import { pageQuery, SORT_DIRECTIONS } from './common.ts';

/* ---------- Requests ---------- */

/** User fields the list can be sorted by. */
export const USER_SORT_FIELDS = [
  'name',
  'email',
  'role',
  'banned',
  'createdAt',
] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

/**
 * User fields the list can be filtered by, each a query param of its own.
 * Filters combine with AND; the backend picks the operator for each one
 * (contains for email and name, equals for role and banned).
 */
export const USER_FILTER_FIELDS = ['email', 'name', 'role', 'banned'] as const;
export type UserFilterField = (typeof USER_FILTER_FIELDS)[number];

/** Query string of GET /users/list. */
export const listUsersQuerySchema = z.strictObject({
  ...pageQuery,
  /** Emails containing this text. */
  email: z.string().max(255).optional(),
  /** Names containing this text. */
  name: z.string().max(255).optional(),
  /** Exact role, e.g. "admin". */
  role: z.string().max(255).optional(),
  /** "true" for banned users, "false" for active ones. */
  banned: z.enum(['true', 'false']).optional(),
  /** Defaults to createdAt. */
  sortBy: z.enum(USER_SORT_FIELDS).optional(),
  /** Defaults to desc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListUsersQuery = z.output<typeof listUsersQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A user in GET /users/list: the Better Auth user, admin fields included. */
export interface ListedUser {
  id: string;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  /** e.g. "admin" or "user". */
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /users/list. */
export interface UsersList {
  users: ListedUser[];
  total: number;
  limit: number;
  offset: number;
}

/** A Better Auth account: one way the user signs in. */
export interface UserAccount {
  id: string;
  /** e.g. "credential" (email and password) or "google". */
  providerId: string;
  /** When this sign-in method was linked. */
  createdAt: Date;
}

/** An active (not expired) Better Auth session. */
export interface UserActiveSession {
  id: string;
  /** When the user signed in. */
  createdAt: Date;
  /** Latest activity on this session. */
  updatedAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  /** The admin's user ID when an admin is impersonating this user. */
  impersonatedBy: string | null;
}

/** Response of GET /users/:id: the listed fields plus activity. */
export interface UserDetail extends ListedUser {
  /** Sign-in methods, e.g. "credential" (email and password) or "google". */
  providers: string[];
  accounts: UserAccount[];
  /** Active sessions, most recently used first. */
  sessions: UserActiveSession[];
  /** Latest session activity; null if never signed in. */
  lastActiveAt: Date | null;
}
