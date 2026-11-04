import { z } from 'zod';
import { pageQuery, requiredText, SORT_DIRECTIONS } from './common.ts';
import { msg } from './messages/index.ts';

/* ---------- Requests ---------- */

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * First and last name: max 127 each, so Better Auth's `name` ("first
 * last", varchar(255)) always fits. Same limit as the auth options.
 */
export const USER_NAME_MAX = 127;

/** At least 8 characters with an uppercase, a lowercase, a digit and a symbol. */
export const PASSWORD_PATTERN =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export const passwordSchema = z
  .string()
  .max(128) // Better Auth's limit
  .regex(PASSWORD_PATTERN, {
    error:
      'Password must contain minimum 8 characters, at least one uppercase letter, one lowercase letter, one number and one special character',
  });

/**
 * Body of POST /users (admins only). The admin picks the password and tells
 * the user, who gets a verification link by email and can sign in once they
 * click it (as after sign-up).
 */
export const createUserBodySchema = z.strictObject({
  firstname: requiredText(USER_NAME_MAX, msg('users.firstname.required')),
  lastname: requiredText(USER_NAME_MAX, msg('users.lastname.required')),
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: msg('common.email.invalid') }).max(255)),
  password: passwordSchema,
  /** Defaults to user. */
  role: z.enum(USER_ROLES).default('user'),
});
export type CreateUserBodyInput = z.input<typeof createUserBodySchema>;
export type CreateUserBody = z.output<typeof createUserBodySchema>;

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

/** Response of GET /users/:id and POST /users: the listed fields plus activity. */
export interface UserDetail extends ListedUser {
  /** Sign-in methods, e.g. "credential" (email and password) or "google". */
  providers: string[];
  accounts: UserAccount[];
  /** Active sessions, most recently used first. */
  sessions: UserActiveSession[];
  /** Latest session activity; null if never signed in. */
  lastActiveAt: Date | null;
}
