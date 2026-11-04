// Shared by the browser and the server. Runtime code per side lives in
// "./client" (browser client, hooks) and "./server" (next/headers).
export { SESSION_COOKIES } from "./cookies.ts";
export { authErrorKey, type AuthError, type AuthErrorKey } from "./errors.ts";
export type { Session, User } from "./client.ts";

import type { User } from "./client.ts";

export const isAdmin = (user: User | null) => user?.role === "admin";
