import { z } from "zod";
import {
  pageQuery,
  SORT_DIRECTIONS,
  requiredText,
  optionalText,
  type Page,
} from "./common.ts";
import { msg } from "./messages/index.ts";
import { permissionsSchema, type Permission } from "./permissions.ts";

/* ---------- Requests ---------- */

/**
 * Body of POST /user-groups and PUT /user-groups/:id. PUT replaces the
 * whole user group: omitted optional fields are cleared.
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
  /** What its members can do (see permissions.ts), the whole list. */
  permissions: permissionsSchema,
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
  /** It applies to every user of the app ("Tutti gli utenti"). */
  allUsers: boolean;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /user-groups. */
export type UserGroupsList = Page<ListedUserGroup>;

/** A user who created or last updated an user group; null if since removed. */
export interface UserGroupUser {
  id: string;
  name: string;
}

/** Response of GET /user-groups/:id, POST /user-groups and PUT /user-groups/:id. */
/** A user in a group. */
export interface UserGroupMember {
  id: string;
  name: string;
  email: string;
}

export interface UserGroupDetail extends ListedUserGroup {
  /** By name. */
  members: UserGroupMember[];
  createdBy: UserGroupUser | null;
  updatedBy: UserGroupUser | null;
  /** Always null: deleted user groups aren't returned. */
  deletedAt: Date | null;
}
