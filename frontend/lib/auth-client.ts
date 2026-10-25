import { createAuthClient } from "better-auth/react";
import { authPlugins } from "./auth-plugins";

/**
 * Better Auth client for the browser. With no baseURL it calls
 * `<this origin>/api/auth`, which next.config.ts proxies to the backend.
 */
export const authClient = createAuthClient({ 
  baseURL: process.env.TINY_CRM_BACKEND_URL,
  plugins: authPlugins() });

export type Session = typeof authClient.$Infer.Session;
export type User = Session["user"];

/** A user-facing message for a Better Auth error. */
export function authErrorMessage(error: { status: number; message?: string }) {
  if (error.status === 401) return "Invalid email or password.";
  if (error.status === 429)
    return "Too many attempts. Please wait a moment and try again.";
  return error.message || "Something went wrong. Please try again.";
}
