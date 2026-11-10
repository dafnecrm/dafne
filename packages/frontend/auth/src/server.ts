import { createAuthClient } from "better-auth/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "./client.ts";
import { authPlugins } from "./plugins.ts";

export interface SessionHelpersOptions {
  /** Base URL of the backend (Better Auth runs there). */
  backendUrl: string;
  /**
   * Public URL of the app, sent as `Origin` so Better Auth's CSRF check
   * accepts requests that carry the session cookie.
   */
  appUrl: string;
  /** Route that clears an invalid session cookie, then goes to sign-in. */
  expiredPath?: string;
}

/** Session helpers for Server Components, route handlers and actions. */
export function createSessionHelpers({
  backendUrl,
  appUrl,
  expiredPath = "/session-expired",
}: SessionHelpersOptions) {
  // Calls the backend directly, forwarding the browser's cookies.
  const serverAuthClient = createAuthClient({
    baseURL: backendUrl,
    plugins: authPlugins(),
  });

  /**
   * Returns the signed-in user, or null. The backend validates the session
   * cookie. Deduplicated per request.
   */
  const getCurrentUser = cache(async (): Promise<User | null> => {
    const cookie = (await headers()).get("cookie");
    if (!cookie) {
      return null;
    }

    const { data, error } = await serverAuthClient.getSession({
      fetchOptions: { headers: { cookie, origin: appUrl }, cache: "no-store" },
    });
    // A failed check is not "signed out": don't let an outage clear sessions.
    if (error) {
      throw new Error(`Session check failed (${error.status}): ${error.message}`);
    }
    return data?.user ?? null;
  });

  /**
   * Returns the signed-in user. Otherwise clears the (invalid) session
   * cookie and redirects to the sign-in page, via `expiredPath`.
   */
  async function requireUser(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) {
      redirect(expiredPath);
    }
    return user;
  }

  return { getCurrentUser, requireUser };
}
