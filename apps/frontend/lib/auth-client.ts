import { useTranslations } from "next-intl";
import { createAuthClient } from "better-auth/react";
import { authPlugins } from "./auth-plugins";

/**
 * Better Auth client for the browser. With no baseURL it calls
 * `<this origin>/api/auth`, which next.config.ts proxies to the backend.
 */
export const authClient = createAuthClient({
  baseURL: process.env.TINY_CRM_BACKEND_URL,
  plugins: authPlugins(),
});

export type Session = typeof authClient.$Infer.Session;
export type User = Session["user"];

/** Better Auth error codes with their own message (`auth.errors`). */
const AUTH_ERROR_CODES = {
  USER_ALREADY_EXISTS: "userExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "userExists",
  INVALID_AVATAR: "invalidAvatar",
} as const;

/**
 * A user-facing message for a Better Auth error, in the user's language.
 * Better Auth answers in English, so known codes and statuses are mapped
 * to messages; anything else falls back to its own text.
 */
export function useAuthErrorMessage() {
  const t = useTranslations();
  return (error: { status: number; code?: string; message?: string }) => {
    const key = AUTH_ERROR_CODES[error.code as keyof typeof AUTH_ERROR_CODES];
    if (key) return t(`auth.errors.${key}`);
    if (error.status === 401) return t("auth.errors.invalidCredentials");
    if (error.status === 429) return t("auth.errors.tooManyAttempts");
    return error.message || t("common.errors.generic");
  };
}
