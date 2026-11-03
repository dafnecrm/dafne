import { getLocale } from "next-intl/server";
import { headers } from "next/headers";

/** Base URL of the Nest API. */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

/**
 * Public URL of this app. Sent as the `Origin` header so Better Auth's CSRF
 * check accepts requests that carry the session cookie. It must be listed in
 * the backend's TRUSTED_ORIGINS.
 */
export const APP_URL = process.env.APP_URL ?? "http://localhost:4000";

/** Error body returned by the backend (Nest validation or Better Auth). */
interface BackendErrorBody {
  message?: string | string[];
  code?: string;
}

export class BackendError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Calls the backend from the server, forwarding the browser's cookies and
 * the user's language.
 * Throws a BackendError when the response is not ok.
 */
export async function backendFetch(path: string, init: RequestInit = {}) {
  const requestHeaders = new Headers(init.headers);
  const cookie = (await headers()).get("cookie");
  if (cookie) requestHeaders.set("cookie", cookie);
  requestHeaders.set("origin", APP_URL);
  // The backend answers errors in this language.
  requestHeaders.set("accept-language", await getLocale());
  if (init.body && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as BackendErrorBody;
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : (body.message ?? res.statusText);
    throw new BackendError(res.status, message);
  }

  return res;
}
