import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedUserGroup = Json<contracts.ListedUserGroup>;
export type UserGroupsList = Json<contracts.UserGroupsList>;
export type UserGroupUser = Json<contracts.UserGroupUser>;
export type UserGroupDetail = Json<contracts.UserGroupDetail>;
