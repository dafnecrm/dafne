import { createAuthClient } from "better-auth/react";
import { useTranslations } from "next-intl";
import { authErrorKey, type AuthError } from "./errors.ts";
import { authPlugins } from "./plugins.ts";

/**
 * Better Auth client for the browser. With no baseURL it calls
 * `<this origin>/api/auth`, which the app proxies to the backend.
 */
export const authClient = createAuthClient({ plugins: authPlugins() });

export type Session = typeof authClient.$Infer.Session;
export type User = Session["user"];

/**
 * A user-facing message for a Better Auth error, in the user's language.
 * The keys (`auth.errors.*`, `common.errors.generic`) are the app's
 * messages; anything unmapped falls back to the error's own text.
 */
export function useAuthErrorMessage() {
  const t = useTranslations();
  return (error: AuthError) => {
    const key = authErrorKey(error);
    if (key) return t(key);
    return error.message || t("common.errors.generic");
  };
}
