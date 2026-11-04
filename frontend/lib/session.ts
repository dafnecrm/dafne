import { createAuthClient } from "better-auth/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "./auth-client";
import { authPlugins } from "./auth-plugins";
import { APP_URL, BACKEND_URL } from "./backend";

export type { User } from "./auth-client";

/**
 * Better Auth client for Server Components: calls the backend directly,
 * forwarding the browser's cookies.
 */
const serverAuthClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: authPlugins(),
});

/**
 * Returns the signed-in user, or null. The backend validates the session
 * cookie. Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return null;

  const { data, error } = await serverAuthClient.getSession({
    fetchOptions: { headers: { cookie, origin: APP_URL }, cache: "no-store" },
  });
  // A failed check is not "signed out": don't let an outage clear sessions.
  if (error)
    throw new Error(`Session check failed (${error.status}): ${error.message}`);
  return data?.user ?? null;
});

export const isAdmin = (user: User | null) => user?.role === "admin";

/**
 * Returns the signed-in user. Otherwise clears the (invalid) session cookie
 * and redirects to the sign-in page, via /session-expired.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/session-expired");
  return user;
}
