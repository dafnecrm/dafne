import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what apps/auth returns.
 */
export type ListedUser = Json<contracts.ListedUser>;
export type UsersList = Json<contracts.UsersList>;
export type UserAccount = Json<contracts.UserAccount>;
export type UserSession = Json<contracts.UserActiveSession>;
export type UserDetail = Json<contracts.UserDetail>;
