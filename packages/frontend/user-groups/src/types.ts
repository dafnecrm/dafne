import type * as contracts from "@dafne/contracts";
import type { Json, Permission } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 * The groups and their members come from apps/auth; what a group can do
 * from this app's API.
 */
export type ListedUserGroup = Json<contracts.ListedUserGroup>;
export type UserGroupsList = Json<contracts.UserGroupsList>;
export type UserGroupUser = Json<contracts.UserGroupUser>;
/** A group of the signed-in user (apps/auth's GET /me/user-groups). */
export type MyUserGroup = Json<contracts.MyUserGroup>;
/** A group (apps/auth) with its permissions in this app. */
export type UserGroupDetail = Json<contracts.UserGroupDetail> & {
  permissions: Permission[];
};
