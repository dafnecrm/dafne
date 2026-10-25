import { cookies, headers } from "next/headers";

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
 * Calls the backend from the server, forwarding the browser's cookies.
 * Throws a BackendError when the response is not ok.
 */
export async function backendFetch(path: string, init: RequestInit = {}) {
  const requestHeaders = new Headers(init.headers);
  const cookie = (await headers()).get("cookie");
  if (cookie) requestHeaders.set("cookie", cookie);
  requestHeaders.set("origin", APP_URL);
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

/**
 * Copies the backend's Set-Cookie headers (the Better Auth session cookies)
 * onto the response sent to the browser. Only works in Server Actions and
 * Route Handlers.
 */
export async function applySetCookies(res: Response) {
  const cookieStore = await cookies();

  for (const header of res.headers.getSetCookie()) {
    const [pair, ...attributes] = header.split(";").map((part) => part.trim());
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator);
    // Next encodes the value again when writing it, so store it decoded.
    const value = decodeURIComponent(pair.slice(separator + 1));

    const options: Parameters<typeof cookieStore.set>[2] = {};
    for (const attribute of attributes) {
      const [key, ...rest] = attribute.split("=");
      const attrValue = rest.join("=");
      switch (key.toLowerCase()) {
        case "max-age":
          options.maxAge = Number(attrValue);
          break;
        case "expires":
          options.expires = new Date(attrValue);
          break;
        case "path":
          options.path = attrValue;
          break;
        case "domain":
          options.domain = attrValue;
          break;
        case "secure":
          options.secure = true;
          break;
        case "httponly":
          options.httpOnly = true;
          break;
        case "samesite":
          options.sameSite = attrValue.toLowerCase() as "lax" | "strict" | "none";
          break;
        case "partitioned":
          options.partitioned = true;
          break;
      }
    }

    cookieStore.set(name, value, options);
  }
}
