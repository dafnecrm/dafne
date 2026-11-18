// Shared by the browser and the server. Runtime code per side lives in
// "./client" (browser client, hooks) and "./server" (next/headers).
export { SESSION_COOKIES } from "./cookies.ts";
export { authErrorKey, type AuthError, type AuthErrorKey } from "./errors.ts";
export type { Session, User } from "./client.ts";

import { isGlobalAdmin, isSuperAdmin as isSuperAdminRole } from "@dafne/contracts";
import type { User } from "./client.ts";

/** Admin or super-admin: every admin permission. */
export const isAdmin = (user: User | null) => isGlobalAdmin(user?.role);

/** Super-admin only: settings above admin's (e.g. the AI assistant's). */
export const isSuperAdmin = (user: User | null) => isSuperAdminRole(user?.role);
