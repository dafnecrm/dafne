import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { BackendError, errorMessage, type BackendErrorBody } from "./errors.ts";

export { BackendError } from "./errors.ts";

/** Base URL of the app's Nest API (e.g. apps/sales-api). */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

/** Base URL of apps/auth: sign-in (Better Auth) and users, shared by the apps. */
export const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:3001";

/**
 * Public URL of this app. Sent as the `Origin` header so Better Auth's CSRF
 * check accepts requests that carry the session cookie. It must be listed in
 * the backend's TRUSTED_ORIGINS.
 */
export const APP_URL = process.env.APP_URL ?? "http://localhost:4000";

/**
 * Calls the app's API from the server, forwarding the browser's cookies and
 * the user's language.
 * Throws a BackendError when the response is not ok.
 */
export function backendFetch(path: string, init: RequestInit = {}) {
  return fetchFrom(BACKEND_URL, path, init);
}

/** Like backendFetch, for apps/auth (e.g. the users: /users/list). */
export function authFetch(path: string, init: RequestInit = {}) {
  return fetchFrom(AUTH_URL, path, init);
}

async function fetchFrom(baseUrl: string, path: string, init: RequestInit) {
  const requestHeaders = new Headers(init.headers);
  const cookie = (await headers()).get("cookie");
  if (cookie) requestHeaders.set("cookie", cookie);
  requestHeaders.set("origin", APP_URL);
  // The backend answers errors in this language.
  requestHeaders.set("accept-language", await getLocale());
  if (init.body && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as BackendErrorBody;
    throw new BackendError(res.status, errorMessage(body, res.statusText));
  }

  return res;
}
