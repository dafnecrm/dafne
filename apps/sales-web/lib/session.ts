import { createSessionHelpers } from "@dafne/frontend-auth/server";
import { APP_URL, AUTH_URL } from "@dafne/frontend-api/server";

export { isAdmin, type User } from "@dafne/frontend-auth";

/** The signed-in user (or null) and the guard for protected pages. */
export const { getCurrentUser, requireUser } = createSessionHelpers({
  // Sessions are apps/auth's (shared by every app).
  backendUrl: AUTH_URL,
  appUrl: APP_URL,
});
