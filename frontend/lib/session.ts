import { redirect } from "next/navigation";
import { cache } from "react";
import { backendFetch } from "./backend";

export interface User {
  id: string;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
}

interface SessionResponse {
  user: User;
  session: { id: string; expiresAt: string };
}

/**
 * Returns the signed-in user, or null. The backend validates the session
 * cookie. Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const res = await backendFetch("/api/auth/get-session");
  const data = (await res.json()) as SessionResponse | null;
  return data?.user ?? null;
});

/**
 * Returns the signed-in user. Otherwise clears the (invalid) session cookie
 * and redirects to the sign-in page, via /session-expired.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/session-expired");
  return user;
}
