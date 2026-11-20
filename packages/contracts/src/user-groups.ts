import { z } from "zod";
import {
  pageQuery,
  SORT_DIRECTIONS,
  requiredText,
  optionalText,
  type Page,
} from "./common.ts";
import { msg } from "./messages/index.ts";

/* ---------- Requests ---------- */

/*
 * The user groups are shared by every app: apps/auth serves them and their
 * members (/user-groups). What a group can do is each app's own: see
 * permissions.ts (GET and PUT /user-groups/:id/permissions on the app's API).
 */

/**
 * Body of POST /user-groups and PUT /user-groups/:id (apps/auth). PUT
 * replaces the whole user group: omitted optional fields are cleared.
 */
export const userGroupBodySchema = z.strictObject({
  name: requiredText(100, msg("userGroups.name.required")),
  description: optionalText(z.string().max(65535)),
  /** Ids of the users in the group (auth.user), the whole list: PUT replaces it. */
  memberIds: z
    .array(z.string().min(1).max(36))
    .max(500)
    .nullish()
    .transform((ids) => [...new Set(ids ?? [])]),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type UserGroupBodyInput = z.input<typeof userGroupBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type UserGroupBody = z.output<typeof userGroupBodySchema>;

/** User group fields the list can be sorted by. */
export const USER_GROUP_SORT_FIELDS = [
  "id",
  "name",
  "description",
  "createdAt",
  "updatedAt",
] as const;
export type UserGroupSortField = (typeof USER_GROUP_SORT_FIELDS)[number];

/**
 * User group fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id and the keys to other records match exactly).
 */
export const USER_GROUP_FILTER_FIELDS = ["id", "name", "description"] as const;
export type UserGroupFilterField = (typeof USER_GROUP_FILTER_FIELDS)[number];

/** Query string of GET /user-groups. Deleted user groups are never listed. */
export const listUserGroupsQuerySchema = z.strictObject({
  ...pageQuery,
  /**
   * Only the groups this user is a member of (auth.user.id). All-users
   * groups have no members: they're left out.
   */
  memberId: z.string().min(1).max(36).optional(),
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  name: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
  /** Defaults to id. */
  sortBy: z.enum(USER_GROUP_SORT_FIELDS).optional(),
  /** Defaults to desc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListUserGroupsQuery = z.output<typeof listUserGroupsQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** An user group in GET /user-groups. */
export interface ListedUserGroup {
  id: number;
  name: string;
  description: string | null;
  /** How many users are in it (0 for an all-users group: it has no list). */
  memberCount: number;
  /** It applies to every user who has access to the app ("Tutti gli utenti"). */
  allUsers: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /user-groups. */
export type UserGroupsList = Page<ListedUserGroup>;

/**
 * A group of the signed-in user, in GET /me/user-groups (apps/auth, by
 * name). Only the groups they're a member of: all-users groups are left out.
 */
export type MyUserGroup = Pick<ListedUserGroup, "id" | "name" | "description">;

/** A user who created or last updated an user group; null if since removed. */
export interface UserGroupUser {
  id: string;
  name: string;
}

/** A user in a group. */
export interface UserGroupMember {
  id: string;
  name: string;
  email: string;
}

/** Response of GET /user-groups/:id, POST /user-groups and PUT /user-groups/:id. */
export interface UserGroupDetail extends ListedUserGroup {
  /** By name. */
  members: UserGroupMember[];
  createdBy: UserGroupUser | null;
  updatedBy: UserGroupUser | null;
  /** Always null: deleted user groups aren't returned. */
  deletedAt: Date | null;
}
